use base64::{engine::general_purpose, Engine};
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

fn calculate_secret_hash(
    username: &str,
    client_id: &str,
    client_secret: &str,
) -> Result<String, String> {
    let message = format!("{}{}", username, client_id);
    let mut mac = HmacSha256::new_from_slice(client_secret.as_bytes())
        .map_err(|e| format!("Failed to create HMAC: {}", e))?;

    mac.update(message.as_bytes());
    let result = mac.finalize();
    let code = result.into_bytes();

    Ok(general_purpose::STANDARD.encode(code))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let user_pool_id = std::env::var("USER_POOL_ID").expect("USER_POOL_ID is not set");
    let client_id = std::env::var("CLIENT_ID").expect("CLIENT_ID is not set");
    let email = std::env::var("EMAIL").expect("EMAIL is not set");
    let password = std::env::var("PASSWORD").expect("PASSWORD is not set");

    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;

    let client = aws_sdk_cognitoidentityprovider::Client::new(&config);

    // https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_DescribeUserPoolClient.html
    let request = client
        .describe_user_pool_client()
        .user_pool_id(user_pool_id.to_string())
        .client_id(client_id.to_string());

    let response = request.send().await?;

    let client_secret = response
        .user_pool_client
        .ok_or("No user pool client")?
        .client_secret
        .ok_or("No client secret")?;

    let hash = calculate_secret_hash(email.as_ref(), client_id.as_ref(), client_secret.as_ref())?;

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
