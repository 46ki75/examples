#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let user = rust_dynamodb::user::User {
        pk: "PK-1".to_string(),
        sk: "SK-1".to_string(),
        id: "ID-1".to_string(),
        name: "John Doe".to_string(),
        email: "john@example.com".to_string(),
        age: 30,
    };

    let response = user.upsert().await?;

    println!("{:?}", response);

    Ok(())
}
