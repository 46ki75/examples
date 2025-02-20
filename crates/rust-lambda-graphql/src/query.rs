use async_graphql::*;

pub struct QueryRoot;

#[async_graphql::Object]
impl QueryRoot {
    /// Returns a greeting message along with the programming language.
    pub async fn greet(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> Result<Greet, async_graphql::Error> {
        Greet::new(ctx)
    }
}

pub struct Greet {
    pub message: String,
    pub language: String,
    pub content_type: String,
}

impl Greet {
    pub fn new(ctx: &async_graphql::Context) -> Result<Self, async_graphql::Error> {
        Ok(Greet {
            message: "Hello, GraphQL!".to_string(),
            language: "Rust".to_string(),
            content_type: ctx
                .data::<lambda_http::http::HeaderMap<lambda_http::http::HeaderValue>>()
                .unwrap()
                .get("content-type")
                .unwrap()
                .to_str()
                .unwrap_or_default()
                .to_string(),
        })
    }
}

#[async_graphql::Object]
impl Greet {
    /// A delightful message from the server
    pub async fn message(&self) -> String {
        self.message.to_string()
    }

    /// Languages that implement GraphQL
    pub async fn language(&self) -> String {
        self.language.to_string()
    }

    pub async fn content_type(&self) -> String {
        self.content_type.to_string()
    }
}
