use opensearch::CreateParts;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv()?;

    let index_name = std::env::var("INDEX_NAME")?;

    let client = rust_aoss::generate_client().await?;

    let crates =
        serde_json::from_slice::<Vec<rust_aoss::CrateInfo>>(include_bytes!("../../seed.json"))?;

    for crate_info in crates {
        let response = client
            .create(CreateParts::IndexId(
                index_name.as_str(),
                crate_info.id.to_string().as_str(),
            ))
            .body(crate_info)
            .send()
            .await?;

        println!("{:#?}", response);
    }

    Ok(())
}
