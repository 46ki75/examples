pub struct InfoService;

impl InfoService {
    pub async fn fetch_info() -> Result<crate::model::info::Info, crate::error::Error> {
        Ok(crate::model::info::Info {
            author: "Shirayuki".to_string(),
        })
    }
}
