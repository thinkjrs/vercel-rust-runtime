use fastrand;
use std::iter::repeat_with;

pub fn generate_number_series(size: usize) -> Vec<f32> {
    let v: Vec<f32> = repeat_with(|| fastrand::f32()).take(size).collect();
    v
}
fn calculate_drift_and_shock(mu: &f32, sigma: &f32, dt: &f32, shock: &f32) -> f32 {
    ((mu - 0.5 * sigma * sigma) * dt + sigma * (shock - 0.5) * (dt.sqrt())).exp()
}
pub fn monte_carlo_series(
    starting_value: &f32,
    mu: &f32,
    sigma: &f32,
    dt: &f32,
    generated_shocks: &Vec<f32>,
) -> Vec<f32> {
    let mut results: Vec<f32> = Vec::with_capacity(generated_shocks.len());
    for (i, shock) in generated_shocks.iter().enumerate() {
        if i > 0 {
            results.push(results[i - 1] * calculate_drift_and_shock(mu, sigma, dt, shock));
        } else {
            results.push(*starting_value);
        }
    }
    results
}
#[cfg(test)]
mod tests {
    use super::*;

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
        let mc = monte_carlo_series(&starting_value, &mu, &sigma, &dt, &random_shocks);
        assert_eq!(mc.len(), size);
        assert_ne!(mc[0], mc[1]);
    }
}
