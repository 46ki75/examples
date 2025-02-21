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
    pub accept_encoding: Option<Vec<String>>,
}

impl Greet {
    pub fn new(ctx: &async_graphql::Context) -> Result<Self, async_graphql::Error> {
        let accept_encoding = ctx
            .data::<lambda_http::http::HeaderMap<lambda_http::http::HeaderValue>>()
            .ok()
            .and_then(|headers| headers.get("accept-encoding"))
            .and_then(|header| header.to_str().ok())
            .map(|header| {
                header
                    .split(",")
                    .map(|s| s.trim().to_string())
                    .collect::<Vec<String>>()
            });

        Ok(Greet {
            message: "Hello, GraphQL!".to_string(),
            language: "Rust".to_string(),
            accept_encoding,
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

    pub async fn accept_encoding(&self) -> Option<Vec<String>> {
        self.accept_encoding.clone()
    }
}
