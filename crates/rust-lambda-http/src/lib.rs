pub mod controller;
pub mod graphql;
pub mod query;
pub mod router;

pub async fn function_handler(
    event: lambda_http::Request,
) -> Result<axum::response::Response<axum::body::Body>, lambda_http::Error> {
    let app = crate::router::init_router();

    use lambda_http::tower::ServiceExt;

    let axum_response = app.oneshot(event).await?;

    Ok(axum_response)
}
