#[derive(serde::Serialize, serde::Deserialize)]
pub struct RouteHandlerResponse {
    pub headers: std::collections::HashMap<String, String>,
    pub body: String,
    pub status_code: u16,
}

pub async fn handle_catch_all(
    event: lambda_http::Request,
) -> Result<RouteHandlerResponse, lambda_http::Error> {
    let path = event.uri().path();

    Ok(RouteHandlerResponse {
        headers: std::collections::HashMap::new(),
        body: format!(
            "Hello, this is a catch-all route handler for path: {}",
            path
        ),
        status_code: 200,
    })
}

pub async fn handle_error(
    event: lambda_http::Request,
) -> Result<RouteHandlerResponse, lambda_http::Error> {
    let path = event.uri().path();

    Ok(RouteHandlerResponse {
        headers: std::collections::HashMap::new(),
        body: format!("An error occurred while processing path: {}", path),
        status_code: 500,
    })
}
