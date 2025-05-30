pub fn init_router() -> axum::Router {
    lambda_http::tracing::info!("Initializing axum router...");

    // GET http://localhost:9000/lambda-url/rust-lambda-rest/hello
    let router =
        axum::Router::new().route("/hello", axum::routing::get(crate::axum_handler::hello));
    router
}
