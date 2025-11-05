"use client";

import { useState, useEffect, useCallback } from "react";
import LineChart from "@/components/LineChart";
import Slider from "@/components/Slider";
import { buildUrl } from "@/utils/build-url";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const DEFAULT_NUM_SIMULATIONS = "10";
const DEFAULT_MU = "50";
const DEFAULT_SIGMA = "150";
const DEFAULT_STARTING_VALUE = "50";
const DEFAULT_NUM_DAYS = "30";

type ChartData = {
  results?: number[][];
};

type AllocationData = {
  strategy: string;
  weights: number[];
  sum: number;
};

type PortfolioPath = {
  label: string;
  values: number[];
  weights: number[];
  color: string;
};

const getBackendData = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    })
    .catch((err) => console.error(err));

export default function Home() {
  const [data, setData] = useState<ChartData>({ results: undefined });
  const [numSimulations, setNumSimulations] = useState(DEFAULT_NUM_SIMULATIONS);
  const [numDays, setNumDays] = useState(DEFAULT_NUM_DAYS);
  const [mu, setMu] = useState(DEFAULT_MU);
  const [sigma, setSigma] = useState(DEFAULT_SIGMA);
  const [startingValue, setStartingValue] = useState(DEFAULT_STARTING_VALUE);
  const [allocationType, setAllocationType] = useState("ew");
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [portfolioPaths, setPortfolioPaths] = useState<PortfolioPath[]>([]);

  const handleRefresh = useCallback(() => {
    setMu(DEFAULT_MU);
    setSigma(DEFAULT_SIGMA);
    setNumDays(DEFAULT_NUM_DAYS);
    setStartingValue(DEFAULT_STARTING_VALUE);
    setNumSimulations(DEFAULT_NUM_SIMULATIONS);
    setAllocation(null);
    setPortfolioPaths([]);
  }, []);

  // --- Helper to compute portfolio value over time ---
  const computePortfolioValue = (prices: number[][], weights: number[]) => {
    if (!prices.length || !weights.length) return [];
    const n = prices[0].length;
    const startValues = prices.map((series) => series[0]);
    const normed = prices.map((series, i) =>
      series.map((v) => v / startValues[i])
    );
    const dailyPortfolio = Array.from({ length: n }, (_, t) =>
      normed.reduce((acc, s, j) => acc + s[t] * weights[j], 0)
    );
    const base = 1_000_000;
    return dailyPortfolio.map((x) => x * base);
  };

  // Fetch simulated prices and auto-update allocations
  useEffect(() => {
    const fetchSimulations = async () => {
      const url = buildUrl(
        `/api/test?samples=${numSimulations}&size=${numDays}&mu=${
          Number(mu) / 10000.0
        }&sigma=${Number(sigma) / 10000.0}&starting_value=${startingValue}`
      );

      try {
        const simData = await getBackendData(url);
        setData(simData);

        // Automatically update all existing allocations
        if (portfolioPaths.length > 0) {
          const updatedPaths = await Promise.all(
            portfolioPaths.map(async (p) => {
              const body = JSON.stringify({
                prices: simData.results,
                strategy: p.label.toLowerCase(),
              });

              try {
                const res = await fetch(buildUrl("/api/allocate"), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const result = await res.json();

                const newValues = computePortfolioValue(
                  simData.results,
                  result.weights
                );

                return {
                  ...p,
                  values: newValues,
                  weights: result.weights,
                };
              } catch (e) {
                console.error(`Failed to update ${p.label}:`, e);
                return p;
              }
            })
          );

          setPortfolioPaths(updatedPaths);
        }
      } catch (err) {
        console.error("Simulation fetch error:", err);
      }
    };

    fetchSimulations();
  }, [numSimulations, numDays, mu, sigma, startingValue]);

  const handleAllocate = async () => {
    if (!data.results || data.results.length === 0) return;

    const body = JSON.stringify({
      prices: data.results,
      strategy: allocationType,
    });

    try {
      const res = await fetch(buildUrl("/api/allocate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setAllocation(result);

      const portfolioValues = computePortfolioValue(
        data.results,
        result.weights
      );
      const color = (() => {
        const existing = portfolioPaths.find((p) =>
          p.label.toLowerCase().startsWith(result.strategy.toLowerCase())
        );
        return existing
          ? existing.color
          : `hsl(${Math.random() * 360}, 70%, 50%)`;
      })();

      // Update or add by strategy
      setPortfolioPaths((prev) => {
        const idx = prev.findIndex((p) =>
          p.label.toLowerCase().startsWith(result.strategy.toLowerCase())
        );
        const updatedEntry: PortfolioPath = {
          label: `${result.strategy.toUpperCase()}`,
          values: portfolioValues,
          weights: result.weights,
          color,
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updatedEntry;
          return copy;
        } else {
          return [...prev, updatedEntry];
        }
      });
    } catch (err) {
      console.error("Allocation error:", err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-2 pt-8 md:p-24">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white text-center">
        Rust-powered Monte Carlo Simulation & Allocation
      </h1>

      <div className="lg:mx-4">
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-200 text-left">
          Using Rust on the server allows performant, low-overhead, memory-safe
          Monte Carlo simulations, portfolio allocation and performance
          simulation.
        </p>
      </div>

      {/* parameter sliders */}
      <div className="pt-4 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Slider
          id="num-simulations-slider"
          labelText="Number of simulations"
          step="20"
          max="500"
          min="20"
          value={numSimulations}
          onValueChange={setNumSimulations}
        />
        <Slider
          id="num-days-slider"
          labelText="Number of days"
          step="10"
          max="100"
          min="10"
          value={numDays}
          onValueChange={setNumDays}
        />
        <Slider
          id="mu-slider"
          labelText="μ"
          step="10"
          max="500"
          min="10"
          value={mu}
          onValueChange={setMu}
          divisor={100}
        />
        <Slider
          id="vol-slider"
          labelText="σ"
          step="10"
          max="5000"
          min="10"
          value={sigma}
          onValueChange={setSigma}
          divisor={100}
        />
        <Slider
          id="starting-value-slider"
          labelText="Starting value"
          step="1"
          max="100"
          min="1"
          value={startingValue}
          onValueChange={setStartingValue}
        />
      </div>

      {/* refresh + allocate controls */}
      <div className="pt-4 pb-4 flex flex-col md:flex-row gap-4 items-center">
        <button
          className="transition duration-300 ease-in-out rounded-md hover:dark:bg-gray-800 active:text-black dark:border dark:border-gray-50 px-3 py-2 active:bg-black active:text-white dark:active:bg-gray-700 dark:active:text-gray-200"
          onClick={handleRefresh}
        >
          Refresh data
        </button>

        <div className="flex items-center gap-4">
          <label
            htmlFor="allocation-type"
            className="text-gray-900 dark:text-gray-200 text-lg font-medium"
          >
            Allocation Type:
          </label>
          <select
            id="allocation-type"
            value={allocationType}
            onChange={(e) => setAllocationType(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-white dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="ew">Equal Weight</option>
            <option value="mvo">Mean-Variance Optimization</option>
            <option value="hrp">Hierarchical Risk Parity</option>
          </select>
          <button
            onClick={handleAllocate}
            className="rounded-md border dark:border-gray-50 px-3 py-2 bg-blue-600 text-white dark:bg-gray-800 hover:bg-blue-700 transition"
          >
            Allocate
          </button>
        </div>
      </div>
      <div className="w-full mt-12">
        <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-4">
          Simulated Asset Prices
        </h2>
        <LineChart data={data} />
      </div>
      {/* --- New chart for allocated portfolio performance --- */}
      {portfolioPaths.length > 0 && (
        <div className="w-full mt-12">
          <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-4">
            Simulated Portfolio Returns ($1M invested)
          </h2>
          <LineChart
            title="Portfolio Performance"
            data={{
              results: portfolioPaths.map((p) => p.values),
            }}
          />
          {/* mini pie charts below */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {portfolioPaths.map((p, idx) => (
              <div
                key={idx}
                className="w-40 flex flex-col items-center bg-white dark:bg-gray-800 p-2 rounded-md shadow-md"
              >
                <Pie
                  data={{
                    labels: p.weights.map((_, i) => `A${i + 1}`),
                    datasets: [
                      {
                        data: p.weights.map((w) => (w * 100).toFixed(2)),
                        backgroundColor: p.weights.map(
                          (_, i) => `hsl(${(i * 60) % 360}, 70%, 50%)`
                        ),
                      },
                    ],
                  }}
                  options={{
                    plugins: {
                      legend: { display: false },
                      title: { display: false },
                    },
                  }}
                />
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {p.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
