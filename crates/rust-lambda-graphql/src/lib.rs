use lambda_http::tower::ServiceExt;

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

pub async fn execute_axum(
    app: axum::Router,
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    let mut axum_request = axum::extract::Request::builder()
        .method(event.method())
        .uri(event.uri());

    for (key, value) in event.headers() {
        axum_request = axum_request.header(key.as_str(), value.as_bytes());
    }

    let request = axum_request
        .body(axum::body::Body::from(event.body().to_vec()))
        .unwrap();

    let axum_response = app.oneshot(request).await?;

    let status = axum_response.status();
    let headers = axum_response.headers().clone();
    let body = axum_response.into_body();
    let body_bytes = axum::body::to_bytes(body, 1024 * 1024).await?;

    let mut lambda_response = lambda_http::Response::builder().status(status);

    for (key, value) in headers {
        if let Some(key) = key {
            lambda_response = lambda_response.header(key.as_str(), value.to_str().unwrap());
        }
    }

    Ok(lambda_response
        .body(lambda_http::Body::Binary(body_bytes.to_vec()))
        .map_err(Box::new)?)
}

async fn graphql_handler(
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

    let gql_response = schema.execute(gql_request).await;

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

pub async fn function_handler(
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    let app = axum::Router::new().route("/", axum::routing::post(graphql_handler));

    let response = execute_axum(app, event).await?;

    Ok(response)
}
