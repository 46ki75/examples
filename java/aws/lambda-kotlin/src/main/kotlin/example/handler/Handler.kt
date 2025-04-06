package example.handler

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.lambda.runtime.LambdaLogger
import com.amazonaws.services.lambda.runtime.RequestHandler
import example.response.Response
import kotlin.collections.Map

class Handler : RequestHandler<Map<String, String>, Response> {

  override fun handleRequest(event: Map<String, String>, context: Context): Response {
    val logger: LambdaLogger = context.logger
    logger.log("EVENT TYPE: ${event::class.java}\n")

    val message = "Hello, world!"
    return Response(message, 200, event)
  }
}
