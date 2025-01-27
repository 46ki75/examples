#[derive(Default, async_graphql::SimpleObject)]
pub struct Greet {
    pub message: String,
    pub language: String,
    pub content_type: String,
}
