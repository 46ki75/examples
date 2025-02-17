mod error;

fn main() {
    env_logger::init();

    log::debug!("This is a debug message");
    log::info!("This is an info message");
    log::warn!("This is a warning");
    log::error!("This is an error");

    println!("Hello, world!");
}
