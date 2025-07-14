pub async fn greet() -> Result<axum::response::Response<axum::body::Body>, axum::http::StatusCode> {
    use futures_util::stream::{self, StreamExt};

    let chars: Vec<char> = "Hello, world!".chars().collect();
    let stream = stream::iter(chars).then(|ch| async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        Ok::<bytes::Bytes, std::convert::Infallible>(bytes::Bytes::from(ch.to_string()))
    });

    let body = axum::body::Body::from_stream(stream);

    let resp = lambda_http::Response::builder()
        .status(200)
        .header("content-type", "text/html")
        .body(body)
        .map_err(Box::new)
        .unwrap();

    Ok(resp)
}
