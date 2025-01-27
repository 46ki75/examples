#[derive(Default)]
pub struct GreetResolver;

#[async_graphql::Object]
impl GreetResolver {
    pub async fn greet(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> Result<crate::model::greet::Greet, async_graphql::Error> {
        crate::service::greet::GreetService::try_greet(ctx)
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))
    }
}
