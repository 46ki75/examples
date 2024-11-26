#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
    let client = aws_sdk_dynamodb::Client::new(&config);
    let req = client.list_tables().limit(10);
    let resp = req.send().await?;
    println!("Current DynamoDB tables: {:?}", resp.table_names);
    Ok(())
}
