#[tokio::main]
async fn main() -> toasty::Result<()> {
    let db = rust_toasty_dynamodb::connect_db().await?;

    db.push_schema().await.unwrap();

    Ok(())
}
