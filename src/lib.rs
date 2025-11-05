use cutup::{MvoConfig, PortfolioAllocator};
use nalgebra::DMatrix;
use rand;
use rand_distr::{Distribution, Normal};
use serde_json::Value;

/// Simulation functions
pub fn generate_number_series(size: usize) -> Vec<f32> {
    let normal = Normal::new(0.0, 1.0).unwrap(); // Standard normal distribution
    let mut rng = rand::thread_rng();
    (0..size).map(|_| normal.sample(&mut rng) as f32).collect()
}

fn calculate_drift_and_shock(mu: &f32, sigma: &f32, dt: &f32, shock: &f32) -> f32 {
    // precise form of the GBM step
    let drift = (mu - (sigma.powi(2) / 2.0)) * dt;
    let shock_val = sigma * shock * dt.sqrt();
    (drift + shock_val).exp()
}

pub fn monte_carlo_series(
    starting_value: f32,
    mu: f32,
    sigma: f32,
    dt: f32,
    generated_shocks: Vec<f32>,
) -> Vec<f32> {
    let mut results: Vec<f32> = Vec::with_capacity(generated_shocks.len());
    results.push(starting_value);

    for (i, shock) in generated_shocks.iter().enumerate() {
        let previous_value = results[i];
        let new_value = previous_value * calculate_drift_and_shock(&mu, &sigma, &dt, &shock);
        results.push(new_value);
    }
    results
}

/// Allocation helpers

/// Converts a nested JSON `prices` array into a DMatrix<f64>.
/// Each inner array represents an asset's price history.
pub fn json_to_price_matrix(v: &Value) -> Result<DMatrix<f64>, String> {
    let prices = v
        .get("prices")
        .and_then(|p| p.as_array())
        .ok_or("Missing 'prices' array")?;

    let cols = prices.len();
    if cols == 0 {
        return Err("Prices array is empty".to_string());
    }
    let rows = prices[0]
        .as_array()
        .ok_or("Each asset must be an array of floats")?
        .len();
    if rows == 0 {
        return Err("Each asset must contain at least one value".to_string());
    }

    for series in prices {
        let s = series.as_array().ok_or("Each asset must be an array")?;
        if s.len() != rows {
            return Err("All asset series must have the same length".to_string());
        }
    }

    let mut flat = Vec::with_capacity(rows * cols);
    for t in 0..rows {
        for j in 0..cols {
            let val = prices[j].as_array().unwrap()[t]
                .as_f64()
                .ok_or("Prices must be numeric")?;
            flat.push(val);
        }
    }

    Ok(DMatrix::from_row_slice(rows, cols, &flat))
}

/// Allocates portfolio weights given a price matrix and strategy.
/// Supported strategies: "mvo", "ew", "hrp"

pub fn allocate_from_prices(
    price_matrix: DMatrix<f64>,
    strategy: &str,
    mvo_config: Option<MvoConfig>,
) -> Result<Vec<f64>, String> {
    let allocator = PortfolioAllocator::new(price_matrix);

    // The cutup methods return HashMap<usize, f64>, not Result.
    let weights_map = match strategy.to_lowercase().as_str() {
        "ew" | "equal" => allocator.ew_allocation(),
        "hrp" => allocator.hrp_allocation(),
        "mvo" | _ => {
            if let Some(cfg) = mvo_config {
                allocator.mvo_allocation_with_config(&cfg)
            } else {
                allocator.mvo_allocation()
            }
        }
    };

    let cols = weights_map.len();
    let mut weights = vec![0.0_f64; cols];
    for (idx, w) in weights_map {
        if idx < cols {
            weights[idx] = w;
        }
    }
    Ok(weights)
}

/// Convenience function: takes a JSON value containing "prices" and "strategy",
/// parses the matrix, allocates, and returns weights.
pub fn allocate_from_json(v: &Value) -> Result<Vec<f64>, String> {
    let matrix = json_to_price_matrix(v)?;
    let strategy = v
        .get("strategy")
        .and_then(|s| s.as_str())
        .unwrap_or("mvo")
        .to_string();
    let mvo_config = if let Some(cfg) = v.get("mvo") {
        Some(MvoConfig {
            regularization: cfg.get("regularization").and_then(|x| x.as_f64()),
            shrinkage: cfg.get("shrinkage").and_then(|x| x.as_f64()),
        })
    } else {
        None
    };
    allocate_from_prices(matrix, &strategy, mvo_config)
}

/// Tests
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn it_calculates_drift_and_shock() {
        let mut calculated: f32 = calculate_drift_and_shock(&0.0, &0.0, &(1.0 / 252.0), &0.0);
        assert_eq!(calculated, 1.0);

        calculated = calculate_drift_and_shock(&1.0, &0.0, &(1.0 / 252.0), &0.0);

        assert!(calculated > 1.003);
        assert!(calculated < 1.004);
    }

    #[test]
    fn it_generates_numbers() {
        let v: Vec<f32> = generate_number_series(10);
        assert_eq!(v.len(), 10);
    }

    #[test]
    fn it_generates_monte_carlo_series() {
        let size = 10;
        let sigma: f32 = 0.015;
        let mu: f32 = -0.002;
        let dt: f32 = 1.0 / 252.0;
        let starting_value: f32 = 50.0;
        let random_shocks: Vec<f32> = generate_number_series(size);
        let mc = monte_carlo_series(starting_value, mu, sigma, dt, random_shocks);
        assert_eq!(mc.len(), size + 1);
        assert_ne!(mc[0], mc[1]);
    }

    #[test]
    fn it_converts_json_to_matrix() {
        let v = json!({
            "prices": [
                [100.0, 101.0, 102.0],
                [200.0, 199.0, 198.0]
            ]
        });
        let m = json_to_price_matrix(&v).unwrap();
        assert_eq!(m.ncols(), 2);
        assert_eq!(m.nrows(), 3);
        assert!((m[(0, 0)] - 100.0).abs() < 1e-8);
    }

    #[test]
    fn it_allocates_equal_weight() {
        let v = json!({
            "prices": [
                [100.0, 101.0, 102.0],
                [200.0, 199.0, 198.0]
            ],
            "strategy": "ew"
        });
        let weights = allocate_from_json(&v).unwrap();
        let sum: f64 = weights.iter().sum();
        assert!((sum - 1.0).abs() < 1e-6);
        assert_eq!(weights.len(), 2);
    }

    #[test]
    fn it_allocates_mvo_default() {
        let v = json!({
            "prices": [
                [100.0, 101.0, 102.0],
                [90.0, 91.0, 92.0]
            ],
            "strategy": "mvo"
        });
        let weights = allocate_from_json(&v).unwrap();
        assert_eq!(weights.len(), 2);
    }
}
