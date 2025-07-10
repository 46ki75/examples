pub mod axum_handler;
pub mod router;

pub async fn function_handler(
    event: lambda_http::Request,
) -> Result<axum::response::Response<axum::body::Body>, lambda_http::Error> {
    let router = crate::router::init_router();

    use lambda_http::tower::ServiceExt;

    let axum_response = router.oneshot(event).await?;

    Ok(axum_response)
}
