use juniper::graphql_object;

pub(crate) struct GreetQuery {
    message: String,
    language: String,
}

impl GreetQuery {
    pub(crate) fn new() -> Self {
        GreetQuery {
            message: String::from("Hello, GraphQL!"),
            language: String::from("Rust"),
        }
    }
}

#[graphql_object]
impl GreetQuery {
    #[graphql(description = "Returns a greeting message")]
    pub(crate) fn message(&self) -> &str {
        &self.message
    }

    #[graphql(description = "Returns the language of the message")]
    pub(crate) fn language(&self) -> &str {
        &self.language
    }
}
