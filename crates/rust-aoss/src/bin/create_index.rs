use opensearch::indices::IndicesCreateParts;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv()?;

    let index_name = std::env::var("INDEX_NAME")?;

    let client = rust_aoss::generate_client().await?;

    let response = client
        .indices()
        .create(IndicesCreateParts::Index(index_name.as_str()))
        .body(json!({
            "mappings" : {
                "properties" : {
                    "name" : { "type" : "text" },
                    "description" : { "type" : "text" }
                }
            }
        }))
        .send()
        .await?;

    println!("{:#?}", response);

    Ok(())
}
