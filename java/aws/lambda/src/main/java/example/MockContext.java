package example;

import com.amazonaws.services.lambda.runtime.ClientContext;
import com.amazonaws.services.lambda.runtime.CognitoIdentity;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;

public class MockContext implements Context {

    @Override
    public String getAwsRequestId() {
        return "mockRequestId";
    }

    @Override
    public String getLogGroupName() {
        return "mockLogGroupName";
    }

    @Override
    public String getLogStreamName() {
        return "mockLogStreamName";
    }

    @Override
    public String getFunctionName() {
        return "mockFunctionName";
    }

    @Override
    public String getFunctionVersion() {
        return "mockFunctionVersion";
    }

    @Override
    public String getInvokedFunctionArn() {
        return "mockFunctionArn";
    }

    @Override
    public CognitoIdentity getIdentity() {
        return null;
    }

    @Override
    public ClientContext getClientContext() {
        return null;
    }

    @Override
    public int getRemainingTimeInMillis() {
        return 300000; // 5 minutes
    }

    @Override
    public int getMemoryLimitInMB() {
        return 512; // Mock 512MB memory
    }

    @Override
    public LambdaLogger getLogger() {
        return new MockLambdaLogger();
    }
}
