#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;

    let client = aws_sdk_dynamodb::Client::new(&config);

    let request = client
        .put_item()
        .table_name("rust-dynamodb")
        .item(
            "PK",
            aws_sdk_dynamodb::types::AttributeValue::S("PK-1".to_string()),
        )
        .item(
            "SK",
            aws_sdk_dynamodb::types::AttributeValue::S("SK-1".to_string()),
        )
        .item(
            "name",
            aws_sdk_dynamodb::types::AttributeValue::S("John Doe".to_string()),
        );

    let response = request.send().await?;

    println!("{:?}", response);

    Ok(())
}
