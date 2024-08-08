use juniper::graphql_object;

pub struct Query;

pub struct GreetQuery;

#[graphql_object]
impl GreetQuery {
    fn message(&self) -> &str {
        "Hello, GraphQL!"
    }

    fn language(&self) -> &str {
        "Rust"
    }
}

#[graphql_object]
impl Query {
    fn greet() -> GreetQuery {
        GreetQuery
    }
}
