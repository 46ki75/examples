use clap::Parser;
use rust_toasty_dynamodb::User;

#[derive(Parser)]
#[command(name = "mytool", version, about)]
struct Cli {
    #[arg(short, long)]
    name: String,

    #[arg(short, long)]
    email: String,

    #[arg(short, long)]
    age: Option<i64>,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    let mut db = rust_toasty_dynamodb::connect_db().await.unwrap();

    let user = toasty::create!(User {
        name: cli.name,
        email: cli.email,
        age: cli.age,
    })
    .exec(&mut db)
    .await
    .unwrap();

    println!("Created: {:?}", user);
}
