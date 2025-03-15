use async_graphql::*;

pub struct QueryRoot;

#[async_graphql::Object]
impl QueryRoot {
    pub async fn factorial(&self, number: u64) -> Result<u64, async_graphql::Error> {
        Ok((1..=number).product())
    }

    /// Returns a greeting message along with the programming language.
    pub async fn greet(&self) -> Result<Greet, async_graphql::Error> {
        Ok(Greet {
            message: "Hello, World!".to_string(),
            language: "Rust".to_string(),
        })
    }
}

#[derive(async_graphql::SimpleObject)]
pub struct Greet {
    pub message: String,
    pub language: String,
}
