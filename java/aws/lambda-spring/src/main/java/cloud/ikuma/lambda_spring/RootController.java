package cloud.ikuma.lambda_spring;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Value;

import java.util.Map;

@RestController
class RootController {

    @Value("${spring.application.name}")
    String name;

    @Value("${app.home}")
    String home;

    @Value("${app.custom}")
    String customVariable;

    @GetMapping("/")
    public Map<String, Object> json() {
        return Map.of("HOME", home, "name", name, "customVariable", customVariable);
    }
}
