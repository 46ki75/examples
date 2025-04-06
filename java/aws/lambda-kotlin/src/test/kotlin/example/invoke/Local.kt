package example.invoke

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import example.handler.Handler
import example.response.Response
import java.io.File
import org.junit.jupiter.api.Tag
import org.junit.jupiter.api.Test

class Local {

    private val pathname = "./event.json"

    @Tag("invoke")
    @Test
    fun invokeHandler() {
        val objectMapper = ObjectMapper()

        try {
            val event: Map<String, String> =
                    objectMapper.readValue(
                            File(pathname),
                            object : TypeReference<Map<String, String>>() {}
                    )

            val context = MockContext()
            val handler = Handler()
            val response: Response = handler.handleRequest(event, context)

            println(response)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
