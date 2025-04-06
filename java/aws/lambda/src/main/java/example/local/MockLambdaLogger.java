package example.local;

import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.logging.LogLevel;

public class MockLambdaLogger implements LambdaLogger {

    @Override
    public void log(String message) {
        System.out.println(String.format("[LOG] %s", message));
    }

    public void log(String message, LogLevel logLevel) {
        System.out.println(String.format("[%s] %s", logLevel.toString(), message));
    }

    @Override
    public void log(byte[] message) {
        System.out.println("[LOG] " + new String(message));
    }

    public void log(byte[] message, LogLevel logLevel) {
        System.out.println(String.format("[%s] %s", new String(message), message));
    }
}
