package example.local;

import java.io.File;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import example.handler.Handler;
import example.response.Response;

public class Local {

    static final String pathname = "./event.json";

    public static void main(String[] args) {

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
