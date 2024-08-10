use async_graphql::*;

pub struct QueryRoot;

use crate::resolvers;

#[async_graphql::Object]
impl QueryRoot {
    /// Returns a greeting message along with the programming language.
    pub async fn greet(&self) -> Result<resolvers::greet::Greet, async_graphql::FieldError> {
        resolvers::greet::Greet::new()
    }
}
