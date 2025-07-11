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

pub async fn execute_graphql(
    parts: lambda_http::http::request::Parts,
    body_bytes: axum::body::Bytes,
) -> Result<
    axum::response::Response<axum::body::Body>,
    (axum::http::StatusCode, axum::Json<serde_json::Value>),
> {
    let schema = init_schema().await;

    let gql_request = match serde_json::from_slice::<async_graphql::Request>(&body_bytes) {
        Ok(request) => request,
        Err(err) => {
            return Err((
                axum::http::StatusCode::BAD_REQUEST,
                axum::Json::from(
                    serde_json::json!({"message": format!("Invalid request body: {}", err)}),
                ),
            ));
        }
    };

    let gql_response = schema
        .execute(gql_request.data(std::sync::Arc::new(parts)))
        .await;

    match serde_json::to_string(&gql_response) {
        Ok(body) => {
            let response = axum::response::Response::builder()
                .status(200)
                .header("content-type", "application/json")
                .body(axum::body::Body::from(body));

            match response {
                Ok(r) => return Ok(r),
                Err(err) => {
                    return Err((
                        axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json::from(
                            serde_json::json!({"message": format!("Failed to serialize response: {}", err)}),
                        ),
                    ))
                }
            }
        }
        Err(err) => {
            lambda_http::tracing::error!("Failed to serialize response: {}", err);
            return Err((
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json::from(
                    serde_json::json!({"message": format!("Failed to serialize response: {}", err)}),
                ),
            ));
        }
    };
}
