use aws_sdk_bedrockruntime::primitives::Blob;

pub async fn greet_stream(
) -> Result<axum::response::Response<axum::body::Body>, axum::http::StatusCode> {
    use futures::stream::StreamExt;

    let chars: Vec<char> = "Hello, stream!".chars().collect();
    let stream = futures::stream::iter(chars).then(|ch| async move {
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
    let stream = futures::stream::once(async move {
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

pub async fn invoke() -> Result<axum::response::Response<axum::body::Body>, axum::http::StatusCode>
{
    let sdk_config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
    let client = aws_sdk_bedrockruntime::Client::new(&sdk_config);

    let receiver = client
        .invoke_model_with_response_stream()
        .model_id("apac.anthropic.claude-sonnet-4-20250514-v1:0")
        .body(Blob::from(
            serde_json::json!({
            "messages": [{ 
                "role": "user", 
                "content": [{ "type": "text", "text": "Can you tell me about the advantages of Amazon Bedrock?" }]
            }],
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000
        })
                .to_string()
                .as_bytes(),
        ))
        .send()
        .await
        .unwrap()
        .body;

    let stream = futures::stream::try_unfold((receiver, 0), |(mut receiver, mut id)| async move {
        type Receiver = aws_sdk_bedrockruntime::primitives::event_stream::EventReceiver<
            aws_sdk_bedrockruntime::types::ResponseStream,
            aws_sdk_bedrockruntime::types::error::ResponseStreamError,
        >;

        let recieved = receiver.recv().await;

        Ok::<Option<(String, (Receiver, u32))>, std::convert::Infallible>(match recieved {
            Ok(Some(event)) => {
                let payload_part = event.as_chunk().unwrap();

                if let Some(blob) = payload_part.bytes() {
                    let data = String::from_utf8_lossy(blob.as_ref()).to_string();
                    id += 1;
                    let event = format!("id: {id}\nevent: message\ndata: {data}\n\n");
                    Some((event, (receiver, id)))
                } else {
                    None
                }
            }
            Ok(None) => None,
            Err(_) => None,
        })
    });

    let body = axum::body::Body::from_stream(stream);

    let resp = lambda_http::Response::builder()
        .status(200)
        .header("content-type", "text/event-stream")
        .body(body)
        .map_err(Box::new)
        .unwrap();

    Ok(resp)
}
