#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let client_id = std::env::var("CLIENT_ID").expect("CLIENT_ID is not set");
    let email = std::env::var("EMAIL").expect("EMAIL is not set");
    let password = std::env::var("PASSWORD").expect("PASSWORD is not set");

    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;

    let client = aws_sdk_cognitoidentityprovider::Client::new(&config);

    let hash = rust_cognito::calculate_secret_hash(email.as_ref(), client_id.as_ref()).await?;

    let request = client
        .sign_up()
        .set_username(Some(email))
        .set_client_id(Some(client_id))
        .set_password(Some(password))
        .secret_hash(hash);

    let response = request.send().await?;

    println!("{:?}", response);

    Ok(())
}
