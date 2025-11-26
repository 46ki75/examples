use aws_config::BehaviorVersion;
use aws_sdk_dynamodb::types::AttributeValue;
use rust_dynamodb::jsonplaceholder;

const TABLE_NAME: &'static str = "jsonplaceholder";

#[tokio::main]
async fn main() {
    let sdk_config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let dynamodb_client = aws_sdk_dynamodb::Client::new(&sdk_config);

    let client = reqwest::Client::new();

    let body = client
        .get("https://jsonplaceholder.typicode.com/users")
        .send()
        .await
        .unwrap()
        .bytes()
        .await
        .unwrap();

    let users: Vec<jsonplaceholder::User> = serde_json::from_slice(&body).unwrap();

    for user in users {
        let _put = dynamodb_client
            .put_item()
            .table_name(TABLE_NAME)
            .item("PK", AttributeValue::S(user.id.to_string()))
            .item("SK", AttributeValue::S("PROFILE#".to_string()))
            .item("facet", AttributeValue::S("USER".to_owned()))
            .item("user_id", AttributeValue::S(user.id.to_string()))
            .item("user_name", AttributeValue::S(user.name.to_string()))
            .item(
                "user_username",
                AttributeValue::S(user.username.to_string()),
            )
            .item("user_email", AttributeValue::S(user.email.to_string()))
            .send()
            .await
            .unwrap();
    }

    let body = client
        .get("https://jsonplaceholder.typicode.com/posts")
        .send()
        .await
        .unwrap()
        .bytes()
        .await
        .unwrap();

    let posts: Vec<jsonplaceholder::Post> = serde_json::from_slice(&body).unwrap();

    for post in posts {
        let _put = dynamodb_client
            .put_item()
            .table_name(TABLE_NAME)
            .item("PK", AttributeValue::S(post.user_id.to_string()))
            .item(
                "SK",
                AttributeValue::S(format!("POST#{}#", post.id.to_string())),
            )
            .item("facet", AttributeValue::S("POST".to_owned()))
            .item("post_id", AttributeValue::S(post.id.to_string()))
            .item("post_title", AttributeValue::S(post.title.to_string()))
            .item("post_body", AttributeValue::S(post.body.to_string()))
            .send()
            .await
            .unwrap();
    }
}
