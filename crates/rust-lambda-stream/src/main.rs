#[tokio::main]
async fn main() -> Result<(), lambda_http::Error> {
    lambda_http::tracing::init_default_subscriber();

    lambda_http::run_with_streaming_response(lambda_http::service_fn(
        rust_lambda_stream::function_handler,
    ))
    .await
}
