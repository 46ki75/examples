package cloud.ikuma.lambda_spring_web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Controller {

    @GetMapping("/")
    public ResponseEntity<String> hello() {
        ResponseEntity<String> response = ResponseEntity
                .status(200)
                .header("Content-Type", "text/plain")
                .body("Hello, World!");

        return response;
    }
}
