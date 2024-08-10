pub struct Greet {
    pub message: String,
    pub language: String,
}

impl Greet {
    pub fn new() -> Result<Self, async_graphql::FieldError> {
        Ok(Greet {
            message: "Hello, GraphQL!".to_string(),
            language: "Rust".to_string(),
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
}
