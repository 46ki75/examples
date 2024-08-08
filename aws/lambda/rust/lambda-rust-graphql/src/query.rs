use juniper::graphql_object;

pub struct Query;

pub struct GreetQuery;

#[graphql_object]
impl GreetQuery {
    #[graphql(description = "Returns a greeting message")]
    fn message(&self) -> &str {
        "Hello, GraphQL!"
    }

    #[graphql(description = "Returns the language of the message")]
    fn language(&self) -> &str {
        "Rust"
    }
}

#[graphql_object]
impl Query {
    #[graphql(description = "Returns a GreetQuery object which contains greeting information")]
    fn greet() -> GreetQuery {
        GreetQuery
    }
}
