use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use lambda_http::{http::Method, run, service_fn, tracing, Body, Error, Request, Response};
use serde_json::json;

mod query;

static SCHEMA: tokio::sync::OnceCell<Schema<query::QueryRoot, EmptyMutation, EmptySubscription>> =
    tokio::sync::OnceCell::const_new();
async fn init_schema() -> &'static Schema<query::QueryRoot, EmptyMutation, EmptySubscription> {
    SCHEMA
        .get_or_init(|| async {
            let schema: Schema<query::QueryRoot, EmptyMutation, EmptySubscription> =
                Schema::build(query::QueryRoot, EmptyMutation, EmptySubscription).finish();
            schema
        })
        .await
}

async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    let schema = init_schema().await;

    if event.method() == Method::POST {
        // GraphQL Execution
        let request_body = event.body();

        let gql_request = match serde_json::from_slice::<async_graphql::Request>(request_body) {
            Ok(request) => request,
            Err(err) => {
                return Ok(Response::builder()
                    .status(400)
                    .header("content-type", "application/json")
                    .body(
                        json!({"error": format!("Invalid request body: {}", err)})
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
                return Ok(Response::builder()
                    .status(500)
                    .header("content-type", "application/json")
                    .body(
                        json!({"error": format!("Failed to serialize response: {}", err)})
                            .to_string()
                            .into(),
                    )
                    .map_err(Box::new)?);
            }
        };

        Ok(Response::builder()
            .status(200)
            .header("content-type", "application/json")
            .body(response_body.into())
            .map_err(Box::new)?)
    } else {
        // Error Response - Method Not Allowed
        let response = Response::builder()
            .status(405)
            .header("content-type", "application/json")
            .body(json!({"error":"Method Not Allowed"}).to_string().into())
            .map_err(Box::new)?;
        Ok(response)
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();
    run(service_fn(function_handler)).await
}
