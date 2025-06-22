const { S3Client, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { verifyToken } = require('../../utils/verifyJwt');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const token = event.headers?.Authorization || event.headers?.authorization;
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ message: 'Missing token' }) };
    }

    const user = await verifyToken(token);

    const scanCmd = new ScanCommand({
      TableName: process.env.DDB_TABLE_NAME,
      FilterExpression: 'userId = :uid',
      ExpressionAttributeValues: {
        ':uid': { S: user.sub },
      },
    });

    const dbResult = await dynamo.send(scanCmd);
    const items = dbResult.Items || [];

    const filteredFiles = [];

    for (const item of items) {
      const s3Key = item.s3Key.S;

      try {
        // Check if file exists
        await s3.send(new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
        }));

        const getObjectCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
        });

        const signedUrl = await getSignedUrl(s3, getObjectCommand, { expiresIn: 300 });

        filteredFiles.push({
          fileName: item.fileName.S,
          s3Key,
          uploadTime: Number(item.timestamp.N),
          signedUrl,
        });

      } catch (err) {
        if (err.name !== 'NotFound') {
          console.error('Error checking file:', err);
        }
        // Skip files that are missing
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(filteredFiles),
    };
  } catch (err) {
    console.error('Error fetching files:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
