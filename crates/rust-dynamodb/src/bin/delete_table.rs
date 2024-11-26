#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;

    let client = aws_sdk_dynamodb::Client::new(&config);

    let request = client.delete_table().table_name("rust-dynamodb");

    let response = request.send().await?;

    println!("{:?}", response);

    Ok(())
}
