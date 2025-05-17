use tower::ServiceExt;

#[derive(Debug, serde::Serialize)]
pub struct Message {
    pub message: String,
}

async fn handler() -> Result<http::Response<axum::body::Body>, http::StatusCode> {
    let message = Message {
        message: String::from("Hello, world!"),
    };

    let message_json =
        serde_json::to_string(&message).map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;

    let response = http::Response::builder()
        .status(http::StatusCode::OK)
        .header(http::header::CONTENT_TYPE, "application/json")
        .body(axum::body::Body::from(message_json))
        .map_err(|_| http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(response)
}

pub(crate) async fn function_handler(
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    let app = axum::Router::new().route("/hello", axum::routing::get(handler));

    let axum_response = app.oneshot(event).await?;

    let (axum_parts, axum_body) = axum_response.into_parts();

    let axum_body_bytes = axum::body::to_bytes(axum_body, usize::MAX).await?;

    let lambda_body = lambda_http::Body::Binary(axum_body_bytes.into());

    let lambda_response = lambda_http::Response::from_parts(axum_parts, lambda_body);

    Ok(lambda_response)
}
