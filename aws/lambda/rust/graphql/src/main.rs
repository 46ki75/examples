use juniper::http::playground::playground_source;
use lambda_http::{http::Method, run, service_fn, tracing, Body, Error, Request, Response};

async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    if event.method() == Method::GET {
        let html = playground_source("", None);
        Ok(Response::builder()
            .status(200)
            .header("content-type", "text/html")
            .body(Body::Text(html))
            .map_err(Box::new)?)
    } else {
        Ok(Response::builder()
            .status(404)
            .body(Body::Text("Not Found".to_string()))
            .map_err(Box::new)?)
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();
    run(service_fn(function_handler)).await
}
