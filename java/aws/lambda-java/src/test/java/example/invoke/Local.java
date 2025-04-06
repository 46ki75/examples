package example.invoke;

import java.io.File;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import example.handler.Handler;
import example.response.Response;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

public class Local {

    static final String pathname = "./event.json";

    @Tag("invoke")
    @Test
    public void invokeHandler() {

        ObjectMapper objectMapper = new ObjectMapper();

        try {
            Map<String, String> event = objectMapper.readValue(new File(pathname),
                    new TypeReference<Map<String, String>>() {
                    });

            MockContext context = new MockContext();

            Handler handler = new Handler();
            Response response = handler.handleRequest(event, context);
            System.out.println(response);

        } catch (Exception e) {
            e.printStackTrace();
        }

    }
}
