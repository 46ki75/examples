package example.response

data class Response(
    val message: String,
    val statusCode: Int,
    val event: Map<String, String>
)
