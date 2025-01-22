package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.lambda.runtime.RequestHandler;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import java.util.Map;

public class Handler implements RequestHandler<Map<String, String>, Response> {

  @Override
  public Response handleRequest(Map<String, String> event, Context context) {

    LambdaLogger logger = context.getLogger();
    logger.log("EVENT TYPE: " + event.getClass());

    // ChromeOptions options = new ChromeOptions();
    // options.addArguments("--headless=new");
    // WebDriver driver = new ChromeDriver(options);

    // driver.get("https://www.selenium.dev/selenium/web/web-form.html");

    // driver.getTitle();

    // driver.manage().timeouts().implicitlyWait(java.time.Duration.ofMillis(500));

    // WebElement textBox = driver.findElement(By.name("my-text"));
    // WebElement submitButton = driver.findElement(By.cssSelector("button"));

    // textBox.sendKeys("Selenium");
    // submitButton.click();

    // WebElement messageElement = driver.findElement(By.id("message"));

    // String message = messageElement.getText();

    // driver.quit();

    String message = "Hello, world!";

    Response response = new Response(message, 200, event);

    return response;
  }

}
