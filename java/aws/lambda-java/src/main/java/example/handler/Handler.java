package example.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.logging.LogLevel;

import example.response.Response;

import java.util.Map;

public class Handler implements RequestHandler<Map<String, String>, Response> {

  @Override
  public Response handleRequest(Map<String, String> event, Context context) {

    LambdaLogger logger = context.getLogger();
    logger.log("EVENT TYPE: " + event.getClass(), LogLevel.INFO);

    String message = "Hello, world!";

    Response response = new Response(message, 200, event);

    return response;
  }

}
