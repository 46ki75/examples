use juniper::graphql_object;

pub struct Query;

// # --------------------------------------------------------------------------------
//
// GreetQuery
//
// # --------------------------------------------------------------------------------

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

// # --------------------------------------------------------------------------------
//
// EchoQuery
//
// # --------------------------------------------------------------------------------

pub struct EchoQuery {
    return_message: String,
}

impl EchoQuery {
    fn new(echo: String) -> Self {
        EchoQuery {
            return_message: echo,
        }
    }
}

#[graphql_object]
impl EchoQuery {
    #[graphql(description = "Returns the received message as it is")]
    fn return_message(&self) -> &str {
        &self.return_message
    }
}

// # --------------------------------------------------------------------------------
//
// Query
//
// # --------------------------------------------------------------------------------

#[graphql_object]
impl Query {
    #[graphql(description = "Returns a GreetQuery object which contains greeting information")]
    fn greet() -> GreetQuery {
        GreetQuery
    }

    #[graphql(description = "Returns an EchoQuery object which contains the received message")]
    fn echo(message: String) -> EchoQuery {
        EchoQuery::new(message)
    }
}
