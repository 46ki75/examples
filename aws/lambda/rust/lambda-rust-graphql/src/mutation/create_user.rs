use juniper::graphql_object;
use uuid::Uuid;

pub(crate) struct CreateUserMutation {
    id: String,
    username: String,
}

impl CreateUserMutation {
    pub(crate) fn new(username: String) -> Self {
        CreateUserMutation {
            id: Uuid::new_v4().to_string(),
            username,
        }
    }
}

#[graphql_object]
impl CreateUserMutation {
    #[graphql(description = "Return the user ID of the user who created it.")]
    pub(crate) fn id(&self) -> &str {
        &self.id
    }

    #[graphql(description = "Return the username of the user who created it.")]
    pub(crate) fn username(&self) -> &str {
        &self.username
    }
}
