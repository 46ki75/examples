async fn function_handler(
    event: lambda_runtime::LambdaEvent<aws_lambda_events::event::sqs::SqsEvent>,
) -> Result<(), lambda_runtime::Error> {
    event.payload.records.iter().for_each(|record| {
        println!("■ Message ID: {:?}", record.message_id);
        println!("■ Body: {}", record.body.as_deref().unwrap_or_default());
        println!(
            "■ MD5 Of Body: {}",
            record.md5_of_body.as_deref().unwrap_or_default()
        );
        println!(
            "■ MD5 Of Message Attributes: {}",
            record
                .md5_of_message_attributes
                .as_deref()
                .unwrap_or_default()
        );
        println!("■ Attributes: {:?}", record.attributes);
        println!("■ Message Attributes: {:?}", record.message_attributes);
    });

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), lambda_runtime::Error> {
    lambda_runtime::tracing::init_default_subscriber();

    lambda_runtime::run(lambda_runtime::service_fn(function_handler)).await
}
