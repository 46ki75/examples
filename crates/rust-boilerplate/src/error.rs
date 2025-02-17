#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("An error occurred: {0}")]
    Generic(String),
    #[error("An error occurred: {0}")]
    Io(#[from] std::io::Error),
}
