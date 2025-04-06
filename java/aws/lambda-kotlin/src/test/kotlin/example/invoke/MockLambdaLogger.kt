package example.invoke

import com.amazonaws.services.lambda.runtime.LambdaLogger
import com.amazonaws.services.lambda.runtime.logging.LogLevel

class MockLambdaLogger : LambdaLogger {

    override fun log(message: String) {
        println("[LOG] $message")
    }

    override fun log(message: String, logLevel: LogLevel) {
        println("[$logLevel] $message")
    }

    override fun log(message: ByteArray) {
        println("[LOG] ${String(message)}")
    }

    override fun log(message: ByteArray, logLevel: LogLevel) {
        println("[$logLevel] ${String(message)}")
    }
}
