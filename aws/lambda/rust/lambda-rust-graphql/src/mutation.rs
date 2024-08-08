use juniper::graphql_object;

pub mod create_user;

pub struct Mutation;

#[graphql_object]
impl Mutation {
    #[graphql(description = "Create an user.")]
    fn create_user(
        #[graphql(description = "The username for the new user.")] username: String,
    ) -> create_user::CreateUserMutation {
        create_user::CreateUserMutation::new(username)
    }
}
