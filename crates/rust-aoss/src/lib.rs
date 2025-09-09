use aws_config::BehaviorVersion;
use opensearch::{
    OpenSearch,
    http::transport::{SingleNodeConnectionPool, TransportBuilder},
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct CrateInfo {
    pub id: u32,
    pub name: String,
    pub description: String,
}

pub async fn generate_client() -> Result<OpenSearch, Box<dyn std::error::Error>> {
    dotenvy::dotenv()?;

    let url = url::Url::parse(std::env::var("AOSS_URL")?.as_str())?;

    let conn_pool = SingleNodeConnectionPool::new(url);

    let aws_config = aws_config::load_defaults(BehaviorVersion::latest())
        .await
        .clone();

    let transport = TransportBuilder::new(conn_pool)
        .auth(aws_config.clone().try_into()?)
        .service_name("aoss")
        .build()?;

    let client = OpenSearch::new(transport);

    Ok(client)
}
