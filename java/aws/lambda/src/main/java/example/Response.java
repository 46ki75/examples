package example;

import java.util.Map;

public record Response(String message, int statusCode, Map<String, String> event) {
}
