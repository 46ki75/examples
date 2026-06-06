from mangum import Mangum

from python_lambda_fastapi.router import app

handler = Mangum(app)
