from aws_lambda_typing.events import APIGatewayProxyEventV2
from aws_lambda_typing.responses import APIGatewayProxyResponseV2
from mangum import Mangum
from router import app


handler = Mangum(app)
