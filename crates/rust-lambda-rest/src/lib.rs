async fn axum_route_handler(
    _parts: http::request::Parts,
    _body: axum::body::Body,
) -> Result<http::Response<axum::body::Body>, http::StatusCode> {
    let json = serde_json::json!({"message":"Hello, world!"}).to_string();

    let response = http::Response::builder()
        .status(http::StatusCode::OK)
        .header(http::header::CONTENT_TYPE, "application/json")
        .body(axum::body::Body::from(json))
        .map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(response)
}

async fn dispatch_request(
    app: axum::Router,
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    use tower::ServiceExt;

    let axum_response = app.oneshot(event).await?;

    let (axum_parts, axum_body) = axum_response.into_parts();

    let axum_body_bytes = axum::body::to_bytes(axum_body, usize::MAX).await?;

    let lambda_body = lambda_http::Body::Binary(axum_body_bytes.into());

    let lambda_response = lambda_http::Response::from_parts(axum_parts, lambda_body);

    Ok(lambda_response)
}

pub async fn function_handler(
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    // GET http://localhost:9000/lambda-url/rust-lambda-rest/hello
    let app = axum::Router::new().route("/hello", axum::routing::get(axum_route_handler));

    let response = dispatch_request(app, event).await?;

    Ok(response)
}
