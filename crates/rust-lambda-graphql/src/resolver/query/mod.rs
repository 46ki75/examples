pub mod greet;

use async_graphql::*;

pub struct QueryRoot;

#[async_graphql::Object]
impl QueryRoot {
    /// Returns a greeting message along with the programming language.
    pub async fn greet(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> Result<crate::model::greet::Greet, async_graphql::Error> {
        crate::resolver::query::greet::GreetResolver
            .greet(ctx)
            .await
    }
}
