static SCHEMA: tokio::sync::OnceCell<
    async_graphql::Schema<
        crate::query::QueryRoot,
        async_graphql::EmptyMutation,
        async_graphql::EmptySubscription,
    >,
> = tokio::sync::OnceCell::const_new();

pub async fn init_schema() -> &'static async_graphql::Schema<
    crate::query::QueryRoot,
    async_graphql::EmptyMutation,
    async_graphql::EmptySubscription,
> {
    SCHEMA
        .get_or_init(|| async {
            let schema: async_graphql::Schema<
                crate::query::QueryRoot,
                async_graphql::EmptyMutation,
                async_graphql::EmptySubscription,
            > = async_graphql::Schema::build(
                crate::query::QueryRoot,
                async_graphql::EmptyMutation,
                async_graphql::EmptySubscription,
            )
            .enable_federation()
            .finish();
            schema
        })
        .await
}
