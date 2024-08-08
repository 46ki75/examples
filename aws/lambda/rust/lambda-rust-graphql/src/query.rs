use juniper::graphql_object;

pub(crate) mod echo;
pub(crate) mod greet;

pub struct Query;

// # --------------------------------------------------------------------------------
//
// Query
//
// # --------------------------------------------------------------------------------

#[graphql_object]
impl Query {
    #[graphql(description = "Returns a GreetQuery object which contains greeting information")]
    fn greet() -> greet::GreetQuery {
        greet::GreetQuery::new()
    }

    #[graphql(description = "Returns an EchoQuery object which contains the received message")]
    fn echo(message: String) -> echo::EchoQuery {
        echo::EchoQuery::new(message)
    }
}
