#[derive(serde::Serialize, utoipa::ToSchema)]
struct GreetResponse {
    message: String,
}

#[utoipa::path(
    get,
    path = "/api/v1/greet",
    responses(
        (status = 200, description = "Greet", body = GreetResponse),
        (status = 400, description = "Bad request", body = String)
    )
)]
pub async fn greet() -> Result<axum::response::Response<axum::body::Body>, axum::http::StatusCode> {
    let body = axum::body::Body::from("Hello, world!");

    let response = axum::response::Response::builder()
        .status(200)
        .header(axum::http::header::CONTENT_TYPE, "text/plain")
        .body(body)
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(response)
}
