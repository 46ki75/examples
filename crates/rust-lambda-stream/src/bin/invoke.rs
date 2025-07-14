#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    let response = client
        .get("http://localhost:9000/lambda-url/rust-lambda-stream/greet")
        .send()
        .await?
        .text()
        .await?;

    println!("{}", response);

    let response = client
        .get("http://localhost:9000/lambda-url/rust-lambda-stream/greet-stream")
        .send()
        .await?;

    let mut stream = response.bytes_stream();

    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let bytes = chunk?;
        let s = String::from_utf8_lossy(&bytes);
        println!("{}", s);
    }

    Ok(())
}
