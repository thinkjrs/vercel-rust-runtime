// api/allocate.rs

use serde_json::{json, Value};
use tsmc_rust::allocate_from_json;
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};

pub async fn handler(req: Request) -> Result<Response<Body>, Error> {
    if req.method() != "POST" {
        return Ok(Response::builder()
            .status(StatusCode::METHOD_NOT_ALLOWED)
            .header("Content-Type", "application/json")
            .body(
                json!({"error": "Use POST with JSON body"})
                    .to_string()
                    .into(),
            )?);
    }

    let body_str = match req.body() {
        Body::Text(t) => t.clone(),
        Body::Binary(b) => String::from_utf8_lossy(b).to_string(),
        Body::Empty => String::new(),
    };

    let parsed: Value = match serde_json::from_str(&body_str) {
        Ok(v) => v,
        Err(e) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .header("Content-Type", "application/json")
                .body(
                    json!({
                        "error": "Invalid JSON",
                        "details": e.to_string()
                    })
                    .to_string()
                    .into(),
                )?)
        }
    };

    if parsed.get("prices").is_none() {
        return Ok(bad_req("Missing 'prices' array")?);
    }

    match allocate_from_json(&parsed) {
        Ok(weights) => {
            let strategy = parsed
                .get("strategy")
                .and_then(|s| s.as_str())
                .unwrap_or("mvo")
                .to_string();

            let response = json!({
                "strategy": strategy,
                "weights": weights,
                "sum": weights.iter().sum::<f64>()
            });

            Ok(Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", "application/json")
                .body(response.to_string().into())?)
        }

        Err(e) => Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header("Content-Type", "application/json")
            .body(json!({"error": e}).to_string().into())?),
    }
}

fn bad_req(msg: &str) -> Result<Response<Body>, Error> {
    Ok(Response::builder()
        .status(StatusCode::BAD_REQUEST)
        .header("Content-Type", "application/json")
        .body(json!({"error": msg}).to_string().into())?)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}
