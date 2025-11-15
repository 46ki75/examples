use utoipa::OpenApi;
use utoipa_axum::{router::OpenApiRouter, routes};

#[derive(OpenApi)]
#[openapi(info(
    title = "web-lambda-http-api",
    version = "1.0.0",
    description = "API description",
    contact(name = "Ikuma Yamashita", email = "me@ikuma.cloud"),
    license(name = "GPL-3.0")
))]
struct ApiDoc;

pub fn init_router() -> axum::Router {
    lambda_http::tracing::info!("Initializing axum router...");

    let (rest_router, auto_generated_api) = OpenApiRouter::new()
        .routes(routes!(crate::controller::greet))
        .split_for_parts();

    let customized_api = ApiDoc::openapi().merge_from(auto_generated_api);

    let router = rest_router
        .route(
            "/api/v1/openapi.json",
            axum::routing::get(|| async move { axum::Json(customized_api) }),
        )
        .route(
            "/graphql",
            axum::routing::get(async || {
                axum::response::Html(
                    async_graphql::http::GraphiQLSource::build()
                        .endpoint("/lambda-url/rust-lambda-graphql")
                        .finish(),
                )
            }),
        )
        .route(
            "/graphql",
            axum::routing::post(crate::graphql::execute_graphql),
        )
        .layer(tower_http::compression::CompressionLayer::new());
    router
}
