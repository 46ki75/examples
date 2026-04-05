use rust_toasty_dynamodb::User;

#[tokio::main]
async fn main() -> toasty::Result<()> {
    // Build a Db handle, registering all models in this crate
    let mut db = toasty::Db::builder()
        .models(toasty::models!(crate::*))
        .connect("sqlite::memory:")
        .await?;

    // Create tables based on registered models
    db.push_schema().await?;

    // Create a user
    let user = toasty::create!(User {
        name: "Alice",
        email: "alice@example.com",
    })
    .exec(&mut db)
    .await?;

    println!("Created: {:?}", user.name);

    // Fetch the user back by primary key
    let found = User::get_by_id(&mut db, &user.id).await?;
    println!("Found: {:?}", found.email);

    Ok(())
}
