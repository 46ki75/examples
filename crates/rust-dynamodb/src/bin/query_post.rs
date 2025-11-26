use aws_config::BehaviorVersion;
use aws_sdk_dynamodb::types::AttributeValue;
use serde::{Deserialize, Serialize};

const TABLE_NAME: &'static str = "jsonplaceholder";

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct Post {
    #[serde(rename = "PK")]
    pub pk: String,
    #[serde(rename = "SK")]
    pub sk: String,

    pub post_id: String,
    pub post_title: String,
    pub post_body: String,
}

#[tokio::main]
async fn main() {
    let sdk_config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let dynamodb_client = aws_sdk_dynamodb::Client::new(&sdk_config);

    let items = dynamodb_client
        .query()
        .table_name(TABLE_NAME)
        .key_condition_expression("PK = :PK AND begins_with(SK, :SK)")
        .expression_attribute_values(":PK", AttributeValue::S("1".to_owned()))
        .expression_attribute_values(":SK", AttributeValue::S("POST#".to_owned()))
        .send()
        .await
        .unwrap()
        .items()
        .to_vec();

    let posts: Vec<Post> = serde_dynamo::from_items(items).unwrap();

    println!("{:#?}", posts);
}
