use juniper::graphql_object;

pub(crate) struct CreateUserMutation {
    username: String,
}

impl CreateUserMutation {
    pub(crate) fn new(username: String) -> Self {
        CreateUserMutation { username }
    }
}

#[graphql_object]
impl CreateUserMutation {
    #[graphql(description = "Return the username of the user who created it.")]
    pub(crate) fn username(&self) -> &str {
        &self.username
    }
}
