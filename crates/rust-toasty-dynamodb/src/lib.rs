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

// Many-to-many: an Image can have many Tags, and a Tag can be on many Images.
// Toasty doesn't ship a `has_many_through` macro — model the relationship
// explicitly with a join entity (`ImageTag`) that has a `BelongsTo` on each
// side. On DynamoDB, the join model needs a GSI on each foreign-key column so
// `image.image_tags()` and `tag.image_tags()` both compile to a Query rather
// than a Scan.

#[derive(Debug, toasty::Model)]
pub struct Image {
    #[key]
    #[auto]
    pub id: Uuid,

    pub filename: String,

    #[has_many]
    pub image_tags: toasty::HasMany<ImageTag>,
}

#[derive(Debug, toasty::Model)]
pub struct Tag {
    #[key]
    #[auto]
    pub id: Uuid,

    #[unique]
    pub name: String,

    #[has_many]
    pub image_tags: toasty::HasMany<ImageTag>,
}

#[derive(Debug, toasty::Model)]
pub struct ImageTag {
    #[key]
    #[auto]
    pub id: Uuid,

    #[index]
    pub image_id: Uuid,

    #[index]
    pub tag_id: Uuid,

    #[belongs_to(key = image_id, references = id)]
    pub image: toasty::BelongsTo<Image>,

    #[belongs_to(key = tag_id, references = id)]
    pub tag: toasty::BelongsTo<Tag>,
}

pub async fn connect_db() -> toasty::Result<toasty::Db> {
    let db = toasty::Db::builder()
        .models(toasty::models!(User, Image, Tag, ImageTag))
        .connect("dynamodb://dynamodb.ap-northeast-1.amazonaws.com")
        .await?;

    Ok(db)
}
