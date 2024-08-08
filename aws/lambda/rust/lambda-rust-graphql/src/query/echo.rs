use juniper::graphql_object;

pub(crate) struct EchoQuery {
    return_message: String,
}

impl EchoQuery {
    pub(crate) fn new(echo: String) -> Self {
        EchoQuery {
            return_message: echo,
        }
    }
}

#[graphql_object]
impl EchoQuery {
    #[graphql(description = "Returns the received message as it is")]
    pub(crate) fn return_message(&self) -> &str {
        &self.return_message
    }
}
