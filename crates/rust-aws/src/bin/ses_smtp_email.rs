use clap::Parser;

use lettre::message::{Mailbox, header::ContentType};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};

#[derive(Parser)]
#[command(version, about, long_about = None)]
struct Args {
    /// Sender email address
    #[arg(long)]
    from: String,

    /// Recipient email address
    #[arg(long)]
    to: String,

    /// SMTP auth username (Amazon SES SMTP username)
    #[arg(long)]
    smtp_auth_username: String,

    /// SMTP auth password (Amazon SES SMTP password)
    #[arg(long)]
    smtp_auth_password: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    let email = Message::builder()
        .from(Mailbox::new(None, args.from.parse().unwrap()))
        .reply_to(Mailbox::new(None, args.from.parse().unwrap()))
        .to(Mailbox::new(None, args.to.parse().unwrap()))
        .subject("Testing 1-2-3")
        .header(ContentType::TEXT_PLAIN)
        .body(String::from("Hello world!"))
        .unwrap();

    let credentials = Credentials::new(args.smtp_auth_username, args.smtp_auth_password);

    let mailer = SmtpTransport::relay("email-smtp.ap-northeast-1.amazonaws.com")
        .unwrap()
        .credentials(credentials)
        .build();

    match mailer.send(&email) {
        Ok(_) => println!("Email sent successfully!"),
        Err(e) => println!("Could not send email: {:?}", e),
    }

    Ok(())
}
