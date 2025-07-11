pub fn init_router() -> axum::Router {
    lambda_http::tracing::info!("Initializing axum router...");

    let router = axum::Router::new()
        .route("/", axum::routing::get(crate::controller::greet))
        .route(
            "/graphql",
            axum::routing::get(async || {
                axum::response::Html(
                    async_graphql::http::GraphiQLSource::build()
                        .endpoint("/lambda-url/rust-lambda-graphql")
                        .finish(),
                )
            }),
        )
        .route(
            "/graphql",
            axum::routing::post(crate::graphql::execute_graphql),
        )
        .layer(tower_http::compression::CompressionLayer::new());
    router
}
