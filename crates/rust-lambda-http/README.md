# GraphQL API Server with AWS Lambda and Amazon API Gateway

This source code example demonstrates how to run a GraphQL API on AWS Lambda.

## Run Locally

### Requirements

- Cargo
- [Cargo Lambda](https://www.cargo-lambda.info/guide/installation.html)

### Run AWS Lambda

To run this codebase locally, you can use the following command:

```sh
cargo lambda watch
```

Then, try to access [http://localhost:9000/lambda-url/rust-lambda-http](http://localhost:9000/lambda-url/rust-lambda-http).

For further infomation, please refer [this documentation (Cargo Lambda)](https://www.cargo-lambda.info/).
