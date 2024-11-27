mod route_handlers;

async fn function_handler(
    event: lambda_http::Request,
) -> Result<lambda_http::Response<lambda_http::Body>, lambda_http::Error> {
    let path = event.uri().path();

    let response = match path {
        "/error" => route_handlers::handle_error(event).await,
        _ => route_handlers::handle_catch_all(event).await,
    }?;

    let mut resp = lambda_http::Response::builder()
        .status(response.status_code)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&response).unwrap().into())
        .map_err(Box::new)?;

    for (key, value) in response.headers {
        resp.headers_mut().insert(
            lambda_http::http::HeaderName::from_bytes(key.as_bytes()).unwrap(),
            value.parse().unwrap(),
        );
    }

    Ok(resp)
}

#[tokio::main]
async fn main() -> Result<(), lambda_http::Error> {
    lambda_http::tracing::init_default_subscriber();

    lambda_http::run(lambda_http::service_fn(function_handler)).await
}
