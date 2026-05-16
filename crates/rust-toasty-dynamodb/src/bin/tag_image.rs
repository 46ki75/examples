use rust_toasty_dynamodb::{Image, ImageTag, Tag};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut db = rust_toasty_dynamodb::connect_db().await?;

    // 1. Create a couple of tags. `name` is #[unique] so we suffix with a UUID
    //    to keep the demo idempotent across runs.
    let suffix = Uuid::new_v4();

    let cat_tag = toasty::create!(Tag {
        name: format!("cat-{suffix}"),
    })
    .exec(&mut db)
    .await?;

    let cute_tag = toasty::create!(Tag {
        name: format!("cute-{suffix}"),
    })
    .exec(&mut db)
    .await?;

    println!("Created tags: {cat_tag:?}, {cute_tag:?}");

    // 2. Create an Image and link it to both tags in one nested create.
    //    `image_id` on the join rows is filled in automatically from the
    //    parent; we only need to provide `tag_id`.
    let image = toasty::create!(Image {
        filename: "kitten.jpg",
        image_tags: [
            { tag_id: cat_tag.id },
            { tag_id: cute_tag.id },
        ],
    })
    .exec(&mut db)
    .await?;

    println!("Created image: {image:?}");

    // 3. Image -> Tag: walk through the join model. This compiles to a Query
    //    against the base ImageTag table (partition pinned by image_id... in
    //    this layout, image_id is a GSI, so it's a GSI Query instead).
    let join_rows: Vec<ImageTag> = image.image_tags().exec(&mut db).await?;
    println!("Image has {} tag links:", join_rows.len());
    for row in &join_rows {
        let tag = Tag::get_by_id(&mut db, &row.tag_id).await?;
        println!("  - {} ({})", tag.name, tag.id);
    }

    // 4. Tag -> Image: the reverse direction queries the tag_id GSI.
    let cat_links: Vec<ImageTag> = cat_tag.image_tags().exec(&mut db).await?;
    println!("Tag '{}' is on {} image(s):", cat_tag.name, cat_links.len());
    for row in &cat_links {
        let img = Image::get_by_id(&mut db, &row.image_id).await?;
        println!("  - {} ({})", img.filename, img.id);
    }

    Ok(())
}
