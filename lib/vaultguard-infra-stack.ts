import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Bucket, BucketEncryption, BlockPublicAccess, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class VaultguardInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 👇 Create a Cognito User Pool for user authentication
    // Create User Pool
    const userPool = new cognito.UserPool(this, 'VaultUserPool', {
      userPoolName: 'vaultguard-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
    });

    userPool.addDomain('VaultUserPoolDomain', {
      cognitoDomain: {
        domainPrefix: 'vaultguard-auth', // Must be unique across AWS
      },
  });

    // Create User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'VaultUserPoolClient', {
      userPool,
      generateSecret: false,
      oAuth: {
        flows: {
          implicitCodeGrant: true,
        },
        callbackUrls: ['http://localhost:3000/callback', 'https://vault-guard-ruddy.vercel.app/callback'], // Update for prod later
        logoutUrls: ['http://localhost:3000', 'https://vault-guard-ruddy.vercel.app'],
      },
    });

    // 👇 Create a new S3 bucket for storing user files
    const userFilesBucket = new Bucket(this, 'VaultGuardUserFilesBucket', {
      bucketName: `vaultguard-user-files-${this.account}`,
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    userFilesBucket.addCorsRule({
  allowedMethods: [HttpMethods.PUT, HttpMethods.GET],
  allowedOrigins: ['*'], // Replace with your frontend domain in prod
  allowedHeaders: ['*'],
});


    // 👇 Create a DynamoDB table for storing user metadata
    const table = new Table(this, 'VaultguardFileMetadataTable', {
      tableName: 'vaultguard-file-metadata',
      partitionKey: { name: 'fileId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST, // On-demand
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 🔥 Only for dev — auto deletes table on `cdk destroy`
    });

    // 👇 Create a Lambda function for uploading files
    const uploadLambda = new lambda.NodejsFunction(this, 'UploadFileLambda', {
      entry: path.join(__dirname, '../lambdas/uploadFiles/index.js'),
      handler: 'handler',
      environment: {
        AWS_LAMBDA_REGION: this.region,
        S3_BUCKET_NAME: userFilesBucket.bucketName,
        DDB_TABLE_NAME: table.tableName,
        COGNITO_JWKS_URI: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/jwks.json`,

      },
      bundling: {
        nodeModules: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', '@aws-sdk/client-dynamodb', 'jsonwebtoken'],
      }
    });

     // 👇 Create a Lambda function for fetching all the files
    const fetchFilesLambda = new lambda.NodejsFunction(this, 'FetchFilesLambda', {
      entry: path.join(__dirname, '../lambdas/fetchFiles/index.js'),
      handler: 'handler',
      environment: {
        AWS_LAMBDA_REGION: this.region,
        S3_BUCKET_NAME: userFilesBucket.bucketName,
        DDB_TABLE_NAME: table.tableName,
        COGNITO_JWKS_URI: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/jwks.json`,

      },
      bundling: {
        nodeModules: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', '@aws-sdk/client-dynamodb', 'jsonwebtoken'],
      }
    });


    // 👇 Grant the Lambda function permissions to read/write to the S3 bucket
    userFilesBucket.grantReadWrite(uploadLambda);
    // 👇 Grant the Lambda function permissions to read/write to the DynamoDB table
    table.grantReadWriteData(uploadLambda);
    // 👇 Grant the Lambda function permissions to read/write to the S3 bucket
    userFilesBucket.grantReadWrite(fetchFilesLambda);
    // 👇 Grant the Lambda function permissions to read/write to the DynamoDB table
    table.grantReadWriteData(fetchFilesLambda);
   


    // Api Gateway for lambda functions
    // 🌐 API Gateway
    const api = new apigateway.RestApi(this, 'VaultApi', {
      restApiName: 'VaultGuard Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Authorization', 'Content-Type', 'authorization'], // Allow Authorization header for Cognito JWT
      },
    });

    // /upload
    const uploadResource = api.root.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(uploadLambda));

    // /files
    const filesResource = api.root.addResource('files');
    filesResource.addMethod('GET', new apigateway.LambdaIntegration(fetchFilesLambda));


    // 👇 Output the bucket name so we can see it in CloudFormation outputs
    new cdk.CfnOutput(this, 'UserFilesBucketName', {
      value: userFilesBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
        new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'JWKSUri', {
        value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/jwks.json`,
    });
  }
}
