#[derive(Debug)]
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
    pub async fn get<S, T>(pk: S, sk: T) -> Result<Self, Box<dyn std::error::Error>>
    where
        S: AsRef<str>,
        T: AsRef<str>,
    {
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;

        let client = aws_sdk_dynamodb::Client::new(&config);

        let request = client
            .get_item()
            .table_name("rust-dynamodb")
            .key(
                "PK",
                aws_sdk_dynamodb::types::AttributeValue::S(pk.as_ref().to_string()),
            )
            .key(
                "SK",
                aws_sdk_dynamodb::types::AttributeValue::S(sk.as_ref().to_string()),
            );

        let response = request.send().await?;

        let item = response.item.ok_or("Item not found.")?;

        let user = User {
            pk: item
                .get("PK")
                .ok_or("PK is not found.")?
                .as_s()
                .map_err(|e| format!("Failed to convert attribute value to string: {:?}", e))?
                .to_string(),
            sk: item
                .get("SK")
                .ok_or("SK is not found.")?
                .as_s()
                .map_err(|e| format!("Failed to convert attribute value to string: {:?}", e))?
                .to_string(),
            id: item
                .get("PK")
                .ok_or("PK is not found.")?
                .as_s()
                .map_err(|e| format!("Failed to convert attribute value to string: {:?}", e))?
                .to_string(),
            name: item
                .get("name")
                .ok_or("name is not found.")?
                .as_s()
                .map_err(|e| format!("Failed to convert attribute value to string: {:?}", e))?
                .to_string(),
            email: item
                .get("email")
                .ok_or("email is not found.")?
                .as_s()
                .map_err(|e| format!("Failed to convert attribute value to string: {:?}", e))?
                .to_string(),
            age: item
                .get("age")
                .ok_or("age is not found.")?
                .as_n()
                .map_err(|e| format!("Failed to convert attribute value to number: {:?}", e))?
                .parse()?,
        };

        Ok(user)
    }

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

    pub async fn delete(self) -> Result<(), Box<dyn std::error::Error>> {
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;

        let client = aws_sdk_dynamodb::Client::new(&config);

        let request = client
            .delete_item()
            .table_name("rust-dynamodb")
            .key("PK", aws_sdk_dynamodb::types::AttributeValue::S(self.pk))
            .key("SK", aws_sdk_dynamodb::types::AttributeValue::S(self.sk));

        let _response = request.send().await?;

        Ok(())
    }
}
