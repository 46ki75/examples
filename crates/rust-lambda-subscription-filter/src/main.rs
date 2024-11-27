async fn function_handler(
    event: lambda_runtime::LambdaEvent<aws_lambda_events::event::cloudwatch_logs::LogsEvent>,
) -> Result<aws_lambda_events::event::cloudwatch_logs::LogsEvent, lambda_runtime::Error> {
    println!("■ Log Group: {}", event.payload.aws_logs.data.log_group);
    println!("■ Log Stream: {}", event.payload.aws_logs.data.log_stream);
    println!("■ Owner: {}", event.payload.aws_logs.data.owner);
    println!(
        "■ Message Type: {}",
        event.payload.aws_logs.data.message_type
    );
    println!(
        "■ Subscription Filters: {:?}",
        event.payload.aws_logs.data.subscription_filters
    );

    for log_event in event.payload.aws_logs.data.log_events.iter() {
        println!();
        println!("  □ Log Event ID: {}", log_event.id);
        println!("  □ Log Event Timestamp: {}", log_event.timestamp);
        println!("  □ Log Event Message: {}", log_event.message);
    }

    Ok(event.payload)
}

#[tokio::main]
async fn main() -> Result<(), lambda_runtime::Error> {
    lambda_runtime::tracing::init_default_subscriber();

    lambda_runtime::run(lambda_runtime::service_fn(function_handler)).await
}
