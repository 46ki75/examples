pub async fn hello(
    _parts: lambda_http::http::request::Parts,
    _body: axum::body::Body,
) -> Result<lambda_http::http::Response<axum::body::Body>, lambda_http::http::StatusCode> {
    let json = serde_json::json!({"message":"Hello, world!"}).to_string();

    let response = lambda_http::http::Response::builder()
        .status(lambda_http::http::StatusCode::OK)
        .header(lambda_http::http::header::CONTENT_TYPE, "application/json")
        .body(axum::body::Body::from(json))
        .map_err(|_| lambda_http::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(response)
}
