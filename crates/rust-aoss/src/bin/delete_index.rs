use opensearch::indices::IndicesDeleteParts;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv()?;

    let index_name = std::env::var("INDEX_NAME")?;

    let client = rust_aoss::generate_client().await?;

    let response = client
        .indices()
        .delete(IndicesDeleteParts::Index(&[index_name.as_str()]))
        .send()
        .await?;

    println!("{:#?}", response);

    Ok(())
}
