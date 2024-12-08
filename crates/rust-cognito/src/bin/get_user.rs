#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let access_token = std::env::var("ACCESS_TOKEN").expect("ACCESS_TOKEN is not set");

    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;

    let client = aws_sdk_cognitoidentityprovider::Client::new(&config);

    let request = client.get_user().access_token(access_token);

    let response = request.send().await?;

    println!("username: {:?}", response.username);

    println!(
        "user attributes: {:?}:{:?}",
        response.user_attributes.first().unwrap().name,
        response
            .user_attributes
            .first()
            .unwrap()
            .value
            .as_ref()
            .unwrap()
    );

    Ok(())
}
