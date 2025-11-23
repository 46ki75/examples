use std::path::Path;

use aws_config::BehaviorVersion;
use tokio::fs;

#[tokio::main]
async fn main() {
    let file = fs::read(Path::new("./Cargo.toml")).await.unwrap();
    let content_length = file.len().try_into().unwrap();

    let sdk_config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let s3_client = aws_sdk_s3::Client::new(&sdk_config);

    let bucket_name = "shared-46ki75-examples-s3-bucket-default";

    let put_request = s3_client
        .put_object()
        .bucket(bucket_name)
        .key("Cargo.toml")
        .content_type("application/toml")
        .content_length(content_length)
        .presigned(
            aws_sdk_s3::presigning::PresigningConfig::builder()
                .expires_in(std::time::Duration::from_secs(300))
                .build()
                .unwrap(),
        )
        .await
        .unwrap();

    let url = put_request.uri();

    println!("{url}");

    let reqwest_client = reqwest::Client::new();
    let request = reqwest_client
        .put(url)
        .header("Content-Type", "application/toml")
        .header("Content-Length", content_length)
        .body(file)
        .send()
        .await
        .unwrap();

    println!("{:#?}", request);

    let response = request.text().await.unwrap();

    println!("{}", response);
}
