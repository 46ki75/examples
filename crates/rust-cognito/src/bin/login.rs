#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let client_id = std::env::var("CLIENT_ID").expect("CLIENT_ID is not set");
    let email = std::env::var("EMAIL").expect("EMAIL is not set");
    let password = std::env::var("PASSWORD").expect("PASSWORD is not set");

    let hash = rust_cognito::calculate_secret_hash(email.as_ref(), client_id.as_ref()).await?;

    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;

    let client = aws_sdk_cognitoidentityprovider::Client::new(&config);

    let request = client
        .initiate_auth()
        .auth_flow(aws_sdk_cognitoidentityprovider::types::AuthFlowType::UserPasswordAuth)
        .client_id(client_id)
        .auth_parameters("USERNAME", email)
        .auth_parameters("PASSWORD", password)
        .auth_parameters("SECRET_HASH", hash);

    let response = request.send().await?;

    println!("{:?}", response);

    println!(
        "\nAccess token:\n{:?}",
        response
            .authentication_result
            .as_ref()
            .unwrap()
            .access_token
            .as_ref()
            .unwrap()
    );

    println!(
        "\nRefresh token:\n{:?}",
        response
            .authentication_result
            .as_ref()
            .unwrap()
            .refresh_token
            .as_ref()
            .unwrap()
    );

    println!(
        "\nID token:\n{:?}",
        response
            .authentication_result
            .as_ref()
            .unwrap()
            .id_token
            .as_ref()
            .unwrap()
    );

    println!(
        "\nExpires in:\n{:?}",
        response.authentication_result.as_ref().unwrap().expires_in
    );

    Ok(())
}
