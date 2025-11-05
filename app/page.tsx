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

  const handleRefresh = useCallback(() => {
    setMu(DEFAULT_MU);
    setSigma(DEFAULT_SIGMA);
    setNumDays(DEFAULT_NUM_DAYS);
    setStartingValue(DEFAULT_STARTING_VALUE);
    setNumSimulations(DEFAULT_NUM_SIMULATIONS);
    setAllocation(null);
  }, []);

  // Fetch simulated prices
  useEffect(() => {
    const url = buildUrl(
      `/api/test?samples=${numSimulations}&size=${numDays}&mu=${
        Number(mu) / 10000.0
      }&sigma=${Number(sigma) / 10000.0}&starting_value=${startingValue}`
    );
    getBackendData(url)
      .then((data) => setData(data))
      .catch((err) => console.error(err));
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
    } catch (err) {
      console.error("Allocation error:", err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-2 pt-8 md:p-24">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white text-center">
        {`Rust-powered Monte Carlo Simulation & Allocation`}
      </h1>

      <div className="lg:mx-4">
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-200 text-left">
          Using Rust on the server allows performant, low-overhead, memory-safe
          Monte Carlo simulations — and now, portfolio allocation too.
        </p>
      </div>

      <LineChart data={data} />

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

      <div className="pt-4 pb-4">
        <button
          className="transition duration-300 ease-in-out rounded-md hover:dark:bg-gray-800 active:text-black dark:border dark:border-gray-50 px-3 py-2 active:bg-black active:text-white dark:active:bg-gray-700 dark:active:text-gray-200"
          onClick={handleRefresh}
        >
          Refresh data
        </button>
      </div>
      <div className="mt-8 flex flex-col md:flex-row items-center gap-4">
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
          className="rounded-md border dark:border-gray-50 px-3 py-2 bg-slate-600 text-white dark:bg-gray-800 hover:bg-slate-700 transition"
        >
          Allocate
        </button>
      </div>

      {allocation && (
        <div className="w-full max-w-md mt-8">
          <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-4">
            Allocation ({allocation.strategy.toUpperCase()})
          </h2>
          <Pie
            data={{
              labels: allocation.weights.map((_, i) => `Asset ${i + 1}`),
              datasets: [
                {
                  data: allocation.weights.map((w) => (w * 100).toFixed(2)),
                  backgroundColor: allocation.weights.map(
                    (_, i) => `hsl(${(i * 60) % 360}, 70%, 50%)`
                  ),
                },
              ],
            }}
            options={{
              plugins: {
                legend: { position: "right" as const },
                title: {
                  display: true,
                  text: "Portfolio Weights (%)",
                },
              },
            }}
          />
          <p className="text-center text-gray-600 dark:text-gray-300 mt-4">
            Total: {(allocation.sum * 100).toFixed(2)}%
          </p>
        </div>
      )}
    </main>
  );
}
