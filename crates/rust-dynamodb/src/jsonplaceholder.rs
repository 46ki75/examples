use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: u64,
    pub name: String,
    pub username: String,
    pub email: String,
    pub address: Address,
    pub company: Company,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct Address {
    pub street: String,
    pub suite: String,
    pub city: String,
    pub zipcode: String,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Company {
    pub name: String,
    pub catch_phrase: String,
    pub bs: String,
}
