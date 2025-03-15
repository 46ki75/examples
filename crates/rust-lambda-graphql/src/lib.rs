pub(crate) mod query;

static SCHEMA: tokio::sync::OnceCell<
    async_graphql::Schema<
        query::QueryRoot,
        async_graphql::EmptyMutation,
        async_graphql::EmptySubscription,
    >,
> = tokio::sync::OnceCell::const_new();
async fn init_schema() -> &'static async_graphql::Schema<
    query::QueryRoot,
    async_graphql::EmptyMutation,
    async_graphql::EmptySubscription,
> {
    SCHEMA
        .get_or_init(|| async {
            let schema: async_graphql::Schema<
                query::QueryRoot,
                async_graphql::EmptyMutation,
                async_graphql::EmptySubscription,
            > = async_graphql::Schema::build(
                query::QueryRoot,
                async_graphql::EmptyMutation,
                async_graphql::EmptySubscription,
            )
            .finish();
            schema
        })
        .await
}

pub async fn function_handler(
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    let schema = init_schema().await;

    if event.method() == lambda_http::http::Method::POST {
        // GraphQL Execution
        let request_body = event.body();

        let gql_request = match serde_json::from_slice::<async_graphql::Request>(request_body) {
            Ok(request) => request,
            Err(err) => {
                return Ok(lambda_http::Response::builder()
                    .status(400)
                    .header("content-type", "application/json")
                    .body(
                        serde_json::json!({"error": format!("Invalid request body: {}", err)})
                            .to_string()
                            .into(),
                    )
                    .map_err(Box::new)?);
            }
        };

        let gql_response = schema.execute(gql_request).await;

        let response_body = match serde_json::to_string(&gql_response) {
            Ok(body) => body,
            Err(err) => {
                lambda_http::tracing::error!("Failed to serialize response: {}", err);
                return Ok(lambda_http::Response::builder()
                    .status(500)
                    .header("content-type", "application/json")
                    .body(
                        serde_json::json!({"error": format!("Failed to serialize response: {}", err)})
                            .to_string()
                            .into(),
                    )
                    .map_err(Box::new)?);
            }
        };

        Ok(lambda_http::Response::builder()
            .status(200)
            .header("content-type", "application/json")
            .body(response_body.into())
            .map_err(Box::new)?)
    } else {
        // Error Response - Method Not Allowed
        let response = lambda_http::Response::builder()
            .status(405)
            .header("content-type", "application/json")
            .body(
                serde_json::json!({"error":"Method Not Allowed"})
                    .to_string()
                    .into(),
            )
            .map_err(Box::new)?;
        Ok(response)
    }
}
