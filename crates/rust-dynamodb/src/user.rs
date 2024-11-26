pub struct User {
    /// Partition key
    pub pk: String,

    /// Sort key
    pub sk: String,

    ///  same as the partition key
    pub id: String,

    /// user name
    pub name: String,

    /// user email
    pub email: String,

    /// user age
    pub age: i32,
}

impl User {
    pub async fn upsert(
        self,
    ) -> Result<aws_sdk_dynamodb::operation::put_item::PutItemOutput, Box<dyn std::error::Error>>
    {
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;

        let client = aws_sdk_dynamodb::Client::new(&config);

        let request = client
            .put_item()
            .table_name("rust-dynamodb")
            .item("PK", aws_sdk_dynamodb::types::AttributeValue::S(self.pk))
            .item("SK", aws_sdk_dynamodb::types::AttributeValue::S(self.sk))
            .item(
                "name",
                aws_sdk_dynamodb::types::AttributeValue::S(self.name),
            )
            .item(
                "email",
                aws_sdk_dynamodb::types::AttributeValue::S(self.email),
            )
            .item(
                "age",
                aws_sdk_dynamodb::types::AttributeValue::N(self.age.to_string()),
            );

        let response = request.send().await?;

        Ok(response)
    }
}
