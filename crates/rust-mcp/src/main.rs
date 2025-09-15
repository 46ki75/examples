use rmcp::{
    ServiceExt,
    handler::server::{router::tool::ToolRouter, wrapper::Parameters},
    model::*,
    tool, tool_handler, tool_router,
    transport::stdio,
};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct Counter {
    counter: Arc<Mutex<i32>>,
    tool_router: ToolRouter<Self>,
}

#[derive(Debug, serde::Deserialize, rmcp::schemars::JsonSchema)]
pub struct AddParams {
    pub value: i32,
}

#[tool_router]
impl Counter {
    fn new() -> Self {
        Self {
            counter: Arc::new(Mutex::new(0)),
            tool_router: Self::tool_router(),
        }
    }

    #[tool(description = "Increment the counter by 1")]
    async fn increment(&self) -> Result<CallToolResult, rmcp::ErrorData> {
        let mut counter = self.counter.lock().await;
        *counter += 1;
        Ok(CallToolResult::success(vec![Content::text(
            counter.to_string(),
        )]))
    }

    #[tool(description = "Add a value to the counter")]
    async fn add(
        &self,
        Parameters(AddParams { value }): Parameters<AddParams>,
    ) -> Result<CallToolResult, rmcp::ErrorData> {
        let mut counter = self.counter.lock().await;
        *counter += value;
        Ok(CallToolResult::success(vec![Content::text(
            counter.to_string(),
        )]))
    }

    #[tool(description = "Get the current counter value")]
    async fn get(&self) -> Result<CallToolResult, rmcp::ErrorData> {
        let counter = self.counter.lock().await;
        Ok(CallToolResult::success(vec![Content::text(
            counter.to_string(),
        )]))
    }
}

#[tool_handler]
impl rmcp::ServerHandler for Counter {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            instructions: Some("A simple calculator".into()),
            capabilities: ServerCapabilities::builder().enable_tools().build(),
            ..Default::default()
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let service = Counter::new().serve(stdio()).await?;
    service.waiting().await?;
    Ok(())
}
