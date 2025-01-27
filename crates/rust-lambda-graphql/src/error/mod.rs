use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Failed to greet")]
    GreetError,
}
