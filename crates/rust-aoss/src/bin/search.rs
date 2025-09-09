use opensearch::SearchParts;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv()?;

    let index_name = std::env::var("INDEX_NAME")?;
    let index_name_binding = [index_name.as_str()];

    let client = rust_aoss::generate_client().await?;

    let query_keyword = "asynchronous";

    let response = client
        .search(SearchParts::Index(&index_name_binding))
        .from(0)
        .size(10)
        .body(json!({
            "query": {
                "fuzzy": {
                    "description": {
                        "value": query_keyword,
                        "fuzziness": "AUTO"
                    }
                }
            }
        }))
        .send()
        .await?;

    println!("{:#?}", response.text().await?);

    Ok(())
}
