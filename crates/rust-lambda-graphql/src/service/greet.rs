use crate::model::greet::Greet;
use async_graphql::Context;
use lambda_http::http::{HeaderMap, HeaderValue};

pub struct GreetService;

impl GreetService {
    pub async fn try_greet(ctx: &Context<'_>) -> Result<Greet, crate::error::Error> {
        let content_type = ctx
            .data::<HeaderMap<HeaderValue>>()
            .unwrap()
            .get("content-type")
            .unwrap()
            .to_str()
            .unwrap_or_default()
            .to_string();

        Ok(Greet {
            content_type,
            language: "Rust".to_string(),
            message: "Hello, GraphQL!".to_string(),
        })
    }
}
