use cutup::{MvoConfig, PortfolioAllocator};
use nalgebra::DMatrix;
use rand;
use rand_distr::{Distribution, Normal};
use serde_json::Value;

/// =======================
/// Simulation Functions
/// =======================

/// Generates a vector of normally distributed random values.
pub fn generate_number_series(size: usize) -> Vec<f32> {
    let normal = Normal::new(0.0, 1.0).expect("Failed to create normal distribution");
    let mut rng = rand::thread_rng();
    (0..size).map(|_| normal.sample(&mut rng) as f32).collect()
}

/// Calculates one geometric Brownian motion step.
fn calculate_drift_and_shock(mu: &f32, sigma: &f32, dt: &f32, shock: &f32) -> f32 {
    let drift = (mu - 0.5 * sigma.powi(2)) * dt;
    let shock_val = sigma * shock * dt.sqrt();
    (drift + shock_val).exp()
}

/// Simulates a Monte Carlo price series for a single asset using GBM.
pub fn monte_carlo_series(
    starting_value: f32,
    mu: f32,
    sigma: f32,
    dt: f32,
    generated_shocks: Vec<f32>,
) -> Vec<f32> {
    let mut prices = Vec::with_capacity(generated_shocks.len() + 1);
    prices.push(starting_value);

    for shock in generated_shocks.iter() {
        let last = *prices.last().unwrap();
        let next = last * calculate_drift_and_shock(&mu, &sigma, &dt, shock);
        prices.push(next);
    }
    prices
}

/// =======================
/// Allocation Functions
/// =======================

/// Converts a JSON object containing `"prices": [[...], [...]]` into a numeric matrix.
pub fn json_to_price_matrix(v: &Value) -> Result<DMatrix<f64>, String> {
    let prices = v
        .get("prices")
        .and_then(|p| p.as_array())
        .ok_or("Missing 'prices' array")?;

    if prices.is_empty() {
        return Err("Prices array is empty".into());
    }

    let rows = prices[0]
        .as_array()
        .ok_or("Each asset must be an array of floats")?
        .len();
    if rows == 0 {
        return Err("Each asset must contain at least one value".into());
    }

    // Validate equal lengths
    for (i, series) in prices.iter().enumerate() {
        let s = series
            .as_array()
            .ok_or(format!("Asset {} must be an array", i))?;
        if s.len() != rows {
            return Err("All asset series must have equal length".into());
        }
    }

    // Flatten into row-major order
    let cols = prices.len();
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

/// Allocates portfolio weights for a given strategy ("ew", "hrp", or "mvo").
pub fn allocate_from_prices(
    price_matrix: DMatrix<f64>,
    strategy: &str,
    mvo_config: Option<MvoConfig>,
) -> Result<Vec<f64>, String> {
    let allocator = PortfolioAllocator::new(price_matrix);

    let weights_map = match strategy.to_lowercase().as_str() {
        "ew" | "equal" => allocator.ew_allocation(),
        "hrp" => allocator.hrp_allocation(),
        "mvo" | _ => match mvo_config {
            Some(cfg) => allocator.mvo_allocation_with_config(&cfg),
            None => allocator.mvo_allocation(),
        },
    };

    // convert HashMap<usize, f64> → ordered Vec<f64>
    let cols = weights_map.len();
    let mut weights = vec![0.0; cols];
    for (idx, w) in weights_map {
        if idx < cols {
            weights[idx] = w;
        }
    }
    Ok(weights)
}

/// Top-level helper: takes JSON input and performs full allocation.
pub fn allocate_from_json(v: &Value) -> Result<Vec<f64>, String> {
    let price_matrix = json_to_price_matrix(v)?;

    let strategy = v
        .get("strategy")
        .and_then(|s| s.as_str())
        .unwrap_or("mvo")
        .to_string();

    let mvo_config = v.get("mvo").map(|cfg| MvoConfig {
        regularization: cfg.get("regularization").and_then(|x| x.as_f64()),
        shrinkage: cfg.get("shrinkage").and_then(|x| x.as_f64()),
    });

    allocate_from_prices(price_matrix, &strategy, mvo_config)
}

/// =======================
/// Tests
/// =======================
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn it_calculates_drift_and_shock() {
        let calc = calculate_drift_and_shock(&0.0, &0.0, &(1.0 / 252.0), &0.0);
        assert_eq!(calc, 1.0);

        let calc = calculate_drift_and_shock(&1.0, &0.0, &(1.0 / 252.0), &0.0);
        assert!(calc > 1.003 && calc < 1.004);
    }

    #[test]
    fn it_generates_random_numbers() {
        let series = generate_number_series(10);
        assert_eq!(series.len(), 10);
    }

    #[test]
    fn it_runs_monte_carlo_simulation() {
        let shocks = generate_number_series(10);
        let mc = monte_carlo_series(50.0, -0.002, 0.015, 1.0 / 252.0, shocks);
        assert_eq!(mc.len(), 11);
    }

    #[test]
    fn it_converts_json_to_matrix() {
        let v = json!({
            "prices": [[100.0, 101.0, 102.0], [200.0, 199.0, 198.0]]
        });
        let m = json_to_price_matrix(&v).unwrap();
        assert_eq!(m.ncols(), 2);
        assert_eq!(m.nrows(), 3);
        assert!((m[(0, 0)] - 100.0).abs() < 1e-8);
    }

    #[test]
    fn it_allocates_equal_weight() {
        let v = json!({
            "prices": [[100.0, 101.0, 102.0], [200.0, 199.0, 198.0]],
            "strategy": "ew"
        });
        let w = allocate_from_json(&v).unwrap();
        assert_eq!(w.len(), 2);
        assert!((w.iter().sum::<f64>() - 1.0).abs() < 1e-6);
    }

    #[test]
    fn it_allocates_mvo() {
        let v = json!({
            "prices": [[100.0, 101.0, 102.0], [90.0, 91.0, 92.0]],
            "strategy": "mvo"
        });
        let w = allocate_from_json(&v).unwrap();
        assert_eq!(w.len(), 2);
    }
}
