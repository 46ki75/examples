mod error;

fn main() {
    env_logger::init();

    log::info!("This is an info message");
    log::warn!("This is a warning");
    log::error!("This is an error");

    println!("Hello, world!");
}
