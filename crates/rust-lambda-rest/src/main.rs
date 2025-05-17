#[tokio::main]
async fn main() -> Result<(), lambda_http::Error> {
    lambda_http::tracing::init_default_subscriber();
    lambda_http::tracing::info!("Lambda runtime API has started.");
    lambda_http::run(lambda_http::service_fn(rust_lambda_rest::function_handler)).await
}
