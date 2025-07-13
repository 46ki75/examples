use lambda_http::{service_fn, tracing, Error};
mod http_handler;
use http_handler::function_handler;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    lambda_http::run_with_streaming_response(service_fn(function_handler)).await
}
