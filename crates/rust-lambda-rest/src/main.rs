use lambda_http::RequestExt;

#[derive(serde::Serialize, serde::Deserialize)]
struct ResponseBody {
    message: String,
    path: String,
    available_paths: Vec<String>,
}

async fn function_handler(
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    let who = event
        .query_string_parameters_ref()
        .and_then(|params| params.first("name"))
        .unwrap_or("world");

    let path = event.uri().path();

    let mut response_body = ResponseBody {
        message: "".to_string(),
        path: path.to_string(),
        available_paths: vec!["/error".to_string()],
    };

    match path {
        "/error" => {
            response_body.message = "An error occurred".to_string();
        }
        _ => {
            response_body.message = format!("Hello {who}, this is an AWS Lambda HTTP request");
        }
    }

    let resp = lambda_http::Response::builder()
        .status(200)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&response_body).unwrap().into())
        .map_err(Box::new)?;
    Ok(resp)
}

#[tokio::main]
async fn main() -> Result<(), lambda_http::Error> {
    lambda_http::tracing::init_default_subscriber();

    lambda_http::run(lambda_http::service_fn(function_handler)).await
}
