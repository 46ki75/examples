use lambda_runtime::{Error, LambdaEvent};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub(crate) struct IncomingMessage {
    url: String,
}

#[derive(Serialize)]
pub(crate) struct OutgoingMessage {
    markdown: String,
}

pub(crate) async fn function_handler(
    event: LambdaEvent<IncomingMessage>,
) -> Result<OutgoingMessage, Error> {
    let markdown = rust_lambda_chrome::fetch(&event.payload.url).await.unwrap();

    let resp = OutgoingMessage { markdown };

    Ok(resp)
}
