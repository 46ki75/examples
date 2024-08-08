use juniper::graphql_object;

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
    fn greet(
        #[graphql(description = "Your name (if not provided, it will display as 'GraphQL')")]
        name: Option<String>,
    ) -> greet::GreetQuery {
        greet::GreetQuery::new(name)
    }
}
