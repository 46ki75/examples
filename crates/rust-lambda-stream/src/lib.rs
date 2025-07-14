use lambda_http::tower::ServiceExt;

pub mod controller;
pub mod router;

pub async fn function_handler(
    event: lambda_http::Request,
) -> Result<lambda_http::Response<axum::body::Body>, lambda_http::Error> {
    let router = router::init_router();

    let request = event;

    let response = router.oneshot(request).await?;

    Ok(response)
}
