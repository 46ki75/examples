use axum::{Router, routing::get};
use std::fs;
use tokio::net::UnixListener;

async fn handler() -> &'static str {
    "Hello, World!"
}

#[tokio::main]
async fn main() {
    // Define the socket path
    let socket_path = "/tmp/http_unix_socket_server.sock";

    // Remove the socket file if it already exists
    let _ = fs::remove_file(socket_path);

    // Create a Unix domain socket listener
    let listener = UnixListener::bind(socket_path).expect("Failed to bind Unix socket");

    println!("Server listening on Unix socket: {}", socket_path);
    println!(
        "Test with: curl --unix-socket {} http://localhost/",
        socket_path
    );

    // Build our application with a single route
    let app = Router::new().route("/", get(handler));

    // Serve the app on the Unix socket
    axum::serve(listener, app)
        .await
        .expect("Failed to start server");
}
