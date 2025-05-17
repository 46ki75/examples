pub mod axum_handler;
pub mod query;
pub mod router;
pub mod schema;

async fn dispatch_request(
    app: axum::Router,
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    use lambda_http::tower::ServiceExt;

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
    let app = crate::router::init_router();

    let response = dispatch_request(app, event).await?;

    Ok(response)
}
