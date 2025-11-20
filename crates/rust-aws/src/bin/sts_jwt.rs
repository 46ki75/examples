#[tokio::main]
async fn main() {
    let sdk_config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
    let sts_client = aws_sdk_sts::Client::new(&sdk_config);

    let request = sts_client
        .get_web_identity_token()
        .audience("my-service")
        .signing_algorithm("ES384");

    let response = request.send().await.unwrap();

    let token = response.web_identity_token.unwrap();
    println!("| Token\n{}", token);
}
