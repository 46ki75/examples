use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};

async fn function_handler(
    event: LambdaEvent<aws_lambda_events::event::cloudwatch_logs::LogsEvent>,
) -> Result<(), Error> {
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
