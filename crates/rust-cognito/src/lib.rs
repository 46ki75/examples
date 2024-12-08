use base64::Engine;
use hmac::Mac;

type HmacSha256 = hmac::Hmac<sha2::Sha256>;

pub async fn calculate_secret_hash(
    username: &str,
    client_id: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let user_pool_id = std::env::var("USER_POOL_ID").expect("USER_POOL_ID is not set");

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

    let message = format!("{}{}", username, client_id);
    let mut mac = HmacSha256::new_from_slice(client_secret.as_bytes())
        .map_err(|e| format!("Failed to create HMAC: {}", e))?;

    mac.update(message.as_bytes());
    let result = mac.finalize();
    let code = result.into_bytes();

    Ok(base64::engine::general_purpose::STANDARD.encode(code))
}
