use clap::{Parser, ValueEnum};
use tsmc_rust;

/// Given historical statistics, generate a Monte Carlo simulation
#[derive(Parser)]
struct MCData {
    /// The number of time periods to simulate
    size: usize,
    /// The historical square root of the return volatility
    sigma: f32,
    /// The historical mean return
    mu: f32,
    /// The time change length
    #[arg(value_enum)]
    dt: Frequency,
    /// The starting asset price value
    starting_value: f32,
}

/// An enum for the time change frequency
#[derive(Debug, Clone, ValueEnum)]
enum Frequency {
    Daily,
    Weekly,
    Monthly,
}

/// Function to get the time change length from the frequency enum
fn get_dt_from_frequency(frequency: Frequency) -> f32 {
    match frequency {
        Frequency::Daily => 1.0 / 252.0,
        Frequency::Weekly => 1.0 / 52.0,
        Frequency::Monthly => 1.0 / 12.0,
    }
}

fn main() {
    let args = MCData::parse();
    let dt = get_dt_from_frequency(args.dt);
    let random_shocks: Vec<f32> = tsmc_rust::generate_number_series(args.size);
    let mc = tsmc_rust::monte_carlo_series(
        &args.starting_value,
        &args.mu,
        &args.sigma,
        &dt,
        &random_shocks,
    );
    println!("{:?}", mc);
    // add JSON input here
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cli_dt_conversion_works() {
        assert!(get_dt_from_frequency(Frequency::Daily) > 0.003);
        assert!(get_dt_from_frequency(Frequency::Daily) < 0.004);
        assert_eq!(get_dt_from_frequency(Frequency::Weekly), 1.0 / 52.0);
        assert_eq!(get_dt_from_frequency(Frequency::Monthly), 1.0 / 12.0);
    }
}
