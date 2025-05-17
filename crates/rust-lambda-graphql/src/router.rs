pub fn init_router() -> axum::Router {
    lambda_http::tracing::info!("Initializing axum router...");

    let router = axum::Router::new().route(
        "/",
        axum::routing::post(crate::axum_handler::graphql_handler),
    );
    router
}
