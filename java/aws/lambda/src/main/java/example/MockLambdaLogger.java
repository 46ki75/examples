package example;

import com.amazonaws.services.lambda.runtime.LambdaLogger;

public class MockLambdaLogger implements LambdaLogger {

    @Override
    public void log(String message) {
        System.out.println("[LOG] " + message);
    }

    @Override
    public void log(byte[] message) {
        System.out.println("[LOG] " + new String(message));
    }
}
