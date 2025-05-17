pub mod query;
pub mod schema;

async fn dispatch_request(
    app: axum::Router,
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    use tower::ServiceExt;

    let axum_response = app.oneshot(event).await?;

    let (axum_parts, axum_body) = axum_response.into_parts();

    let axum_body_bytes = axum::body::to_bytes(axum_body, usize::MAX).await?;

    let lambda_body = lambda_http::Body::Binary(axum_body_bytes.into());

    let lambda_response = lambda_http::Response::from_parts(axum_parts, lambda_body);

    Ok(lambda_response)
}

async fn graphql_handler(
    parts: http::request::Parts,
    body_bytes: axum::body::Bytes,
) -> Result<
    axum::response::Response<axum::body::Body>,
    (axum::http::StatusCode, axum::Json<serde_json::Value>),
> {
    let schema = schema::init_schema().await;

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

pub async fn function_handler(
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    let app = axum::Router::new().route("/", axum::routing::post(graphql_handler));

    let response = dispatch_request(app, event).await?;

    Ok(response)
}
