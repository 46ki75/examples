use uuid::Uuid;

#[derive(Debug, toasty::Model)]
pub struct User {
    #[key]
    #[auto]
    pub id: Uuid,

    pub name: String,

    #[unique]
    pub email: String,

    #[index]
    age: Option<i64>,
}

pub async fn connect_db() -> toasty::Result<toasty::Db> {
    let db = toasty::Db::builder()
        .models(toasty::models!(User))
        .connect("dynamodb://dynamodb.ap-northeast-1.amazonaws.com")
        .await?;

    Ok(db)
}
