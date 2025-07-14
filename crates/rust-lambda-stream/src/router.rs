pub fn init_router() -> axum::Router {
    lambda_http::tracing::info!("Initializing axum router...");

    let router = axum::Router::new()
        .route(
            "/greet-stream",
            axum::routing::get(crate::controller::greet_stream),
        )
        .route("/greet", axum::routing::get(crate::controller::greet))
        .layer(tower_http::compression::CompressionLayer::new());
    router
}
