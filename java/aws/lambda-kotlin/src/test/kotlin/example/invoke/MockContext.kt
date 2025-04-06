package example.invoke

import com.amazonaws.services.lambda.runtime.ClientContext
import com.amazonaws.services.lambda.runtime.CognitoIdentity
import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.lambda.runtime.LambdaLogger

class MockContext : Context {

    override fun getAwsRequestId(): String = "mockRequestId"
    override fun getLogGroupName(): String = "mockLogGroupName"
    override fun getLogStreamName(): String = "mockLogStreamName"
    override fun getFunctionName(): String = "mockFunctionName"
    override fun getFunctionVersion(): String = "mockFunctionVersion"
    override fun getInvokedFunctionArn(): String = "mockFunctionArn"
    override fun getIdentity(): CognitoIdentity? = null
    override fun getClientContext(): ClientContext? = null
    override fun getRemainingTimeInMillis(): Int = 300_000
    override fun getMemoryLimitInMB(): Int = 512
    override fun getLogger(): LambdaLogger = MockLambdaLogger()
}
