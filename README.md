# VaultGuard Infra

Infrastructure-as-Code (IaC) setup for the [VaultGuard](https://github.com/your-org/vaultguard) project using AWS CDK in TypeScript. This repository provisions AWS services like Cognito, S3, DynamoDB, Lambda, and API Gateway.

---

## 🛠️ Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- AWS account with programmatic access
- [CDK CLI](https://docs.aws.amazon.com/cdk/latest/guide/cli.html)

```bash
npm install -g aws-cdk
```

---

## ⚙️ AWS CLI Setup

### 1. Configure AWS Profile

```bash
aws configure --profile vaultguard
```

> You will be prompted to enter:
> - AWS Access Key ID
> - AWS Secret Access Key
> - Default region (e.g., `eu-north-1`)
> - Output format (`json`)

This will save the credentials to your `~/.aws/credentials` file.

---

## 🚀 CDK Commands

### 1. Install dependencies

```bash
npm install
```

### 2. Bootstrap your AWS environment

This prepares your AWS account for deploying CDK stacks.

```bash
npx cdk bootstrap aws://<ACCOUNT_ID>/<REGION> --profile vaultguard
```

_Example:_

```bash
npx cdk bootstrap aws://381491905011/eu-north-1 --profile vaultguard
```

### 3. Deploy the stack

```bash
npx cdk deploy --profile vaultguard
```

To specify a particular stack:

```bash
npx cdk deploy VaultguardInfraStack --profile vaultguard
```

---

## 🧱 Project Structure

```
vaultguard-infra/
├── bin/
│   └── vaultguard-infra.ts         # Entry point
├── lib/
│   └── vaultguard-infra-stack.ts   # CDK Stack definition
├── lambda/
│   └── uploadFileLambda/           # Example Lambda code
├── package.json
├── cdk.json
└── tsconfig.json
```

---

## 🧪 Useful Commands

- **Synthesize CloudFormation Template:**
  ```bash
  npx cdk synth --profile vaultguard
  ```

- **Destroy Stack:**
  ```bash
  npx cdk destroy --profile vaultguard
  ```

- **Watch for file changes and compile TypeScript:**
  ```bash
  npm run watch
  ```

---

## 🧠 Tips

- Always verify you're using the correct profile with:
  ```bash
  aws sts get-caller-identity --profile vaultguard
  ```

- Ensure your Lambda code is zipped and uploaded from `lib/` or pulled from GitHub as needed.

---

## 📦 External Links

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)
- [VaultGuard Frontend](https://github.com/mridulsikka141090/vaultguard)

---

## 👨‍💻 Contributors

- **Mridul Sikka** – [@mridulsikka](https://github.com/mridulsikka)
