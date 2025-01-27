#[derive(Default)]
pub struct Greet {
    pub message: String,
    pub language: String,
    pub content_type: String,
}

#[async_graphql::Object]
impl Greet {
    pub async fn message(&self) -> &str {
        &self.message
    }

    pub async fn language(&self) -> &str {
        &self.language
    }

    pub async fn content_type(&self) -> &str {
        &self.content_type
    }

    pub async fn info(&self) -> Result<crate::model::info::Info, crate::error::Error> {
        crate::service::info::InfoService::fetch_info().await
    }
}
