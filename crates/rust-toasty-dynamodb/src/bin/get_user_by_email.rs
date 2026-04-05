use clap::Parser;
use rust_toasty_dynamodb::User;

#[derive(Parser)]
#[command(name = "get_user_by_email", version, about)]
struct Cli {
    #[arg(short, long)]
    email: String,
}

#[tokio::main]
async fn main() -> toasty::Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let cli = Cli::parse();

    let mut db = rust_toasty_dynamodb::connect_db().await?;

    let found = User::get_by_email(&mut db, &cli.email).await?;

    println!("Found: {:?}", found);

    Ok(())
}
