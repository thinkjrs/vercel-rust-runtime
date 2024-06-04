use reqwest::Url;
use serde_json::json;
use std::collections::HashMap;
use tsmc_rust;
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}

pub async fn handler(_req: Request) -> Result<Response<Body>, Error> {
    let url = Url::parse(&_req.uri().to_string())?;

    // read url query params
    let query_params = url
        .query_pairs()
        .into_owned()
        .collect::<HashMap<String, String>>();
    let samples: usize = query_params
        .get("samples")
        .and_then(|s| s.parse().ok())
        .unwrap_or(10);
    let size: usize = query_params
        .get("size")
        .and_then(|s| s.parse().ok())
        .unwrap_or(100);
    let starting_value: f32 = query_params
        .get("starting_value")
        .and_then(|s| s.parse().ok())
        .unwrap_or(50.0);
    let mu: f32 = query_params
        .get("mu")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.001);
    let sigma: f32 = query_params
        .get("sigma")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.015);
    let dt: f32 = query_params
        .get("dt")
        .and_then(|s| s.parse().ok())
        .unwrap_or(1.0 / 252.0);

    let mut results: Vec<Vec<f32>> = Vec::with_capacity(samples);
    for _i in 1..samples {
        let random_shocks: Vec<f32> = tsmc_rust::generate_number_series(size);

        let mc = tsmc_rust::monte_carlo_series(starting_value, mu, sigma, dt, random_shocks);
        results.push(mc);
    }
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .body(
            json!({ "message": "Rust is the best!", "results": results })
                .to_string()
                .into(),
        )?)
}
