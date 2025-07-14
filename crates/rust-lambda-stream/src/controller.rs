pub async fn greet_stream(
) -> Result<axum::response::Response<axum::body::Body>, axum::http::StatusCode> {
    use futures_util::stream::StreamExt;

    let chars: Vec<char> = "Hello, stream!".chars().collect();
    let stream = futures_util::stream::iter(chars).then(|ch| async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        Ok::<bytes::Bytes, std::convert::Infallible>(bytes::Bytes::from(ch.to_string()))
    });

    let body = axum::body::Body::from_stream(stream);

    let resp = lambda_http::Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body(body)
        .map_err(Box::new)
        .unwrap();

    Ok(resp)
}

pub async fn greet() -> Result<axum::response::Response<axum::body::Body>, axum::http::StatusCode> {
    let s = "Hello, world!".to_owned();
    let stream = futures_util::stream::once(async move {
        let result: Result<bytes::Bytes, std::convert::Infallible> = Ok(bytes::Bytes::from(s));
        result
    });

    let body = axum::body::Body::from_stream(stream);

    let resp = lambda_http::Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body(body)
        .map_err(Box::new)
        .unwrap();

    Ok(resp)
}
