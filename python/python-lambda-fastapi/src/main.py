from aws_lambda_typing.events import APIGatewayProxyEventV2
from aws_lambda_typing.responses import APIGatewayProxyResponseV2


def handler(event: APIGatewayProxyEventV2, context) -> APIGatewayProxyResponseV2:
    return {"statusCode": 200, "body": "Hello, world!"}
