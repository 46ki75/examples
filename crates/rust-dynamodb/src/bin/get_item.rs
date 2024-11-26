#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let user = rust_dynamodb::user::User::get("PK-1", "SK-1").await?;

    println!("{:?}", user);

    Ok(())
}
