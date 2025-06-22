
const { verifyToken } = require('../../utils/verifyJwt');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const crypto = require('crypto');

const REGION = process.env.AWS_LAMBDA_REGION;
const BUCKET = process.env.S3_BUCKET_NAME;
const TABLE_NAME = process.env.DDB_TABLE_NAME;

const s3 = new S3Client({ region: REGION });
const dynamo = new DynamoDBClient({ region: REGION });

exports.handler = async (event) => {
  try {
    const { fileName, fileType } = JSON.parse(event.body);
    const token = event.headers.Authorization || event.headers.authorization;

    if (!token) return { statusCode: 401, body: 'Missing token' };

    const user = await verifyToken(token);

    const fileId = crypto.randomUUID();
    const key = `${user.sub}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });

    await dynamo.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        fileId: { S: fileId },
        userId: { S: user.sub },
        fileName: { S: fileName },
        s3Key: { S: key },
        timestamp: { N: Date.now().toString() },
      }
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
  },
      body: JSON.stringify({ url }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
