use lambda_http::http::{HeaderMap, HeaderValue};

pub struct Greet {
    pub message: String,
    pub language: String,
    pub content_type: String,
}

impl Greet {
    pub fn new(ctx: &async_graphql::Context) -> Result<Self, async_graphql::FieldError> {
        Ok(Greet {
            message: "Hello, GraphQL!".to_string(),
            language: "Rust".to_string(),
            content_type: ctx
                .data::<HeaderMap<HeaderValue>>()
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
