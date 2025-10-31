"use client";

import { useState, useEffect, useRef } from "react";
import LineChart from "@/components/LineChart";
import { buildUrl } from "@/utils/build-url";
import Slider from "@/components/Slider";

const DEFAULT_NUM_SIMULATIONS = "10";
const DEFAULT_MU = "50";
const DEFAULT_SIGMA = "150";
const DEFAULT_STARTING_VALUE = "50";
const DEFAULT_NUM_DAYS = "30";

type ChartData = {
  results?: [][];
  message?: string;
};
const getBackendData = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
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
  const [shouldRefresh, setShouldRefresh] = useState(true);
  useEffect(() => {
    if (shouldRefresh) {
      const url = buildUrl(
        `/api/test?samples=${DEFAULT_NUM_SIMULATIONS}&size=${DEFAULT_NUM_DAYS}&mu=${
          Number(DEFAULT_MU) / 10000.0
        }&sigma=${
          Number(DEFAULT_SIGMA) / 10000.0
        }&starting_value=${DEFAULT_STARTING_VALUE}`
      );
      getBackendData(url)
        .then((data) => setData(data))
        .catch((err) => console.error(err));
      setMu(DEFAULT_MU);
      setSigma(DEFAULT_SIGMA);
      setNumDays(DEFAULT_NUM_DAYS);
      setStartingValue(DEFAULT_STARTING_VALUE);
      setNumSimulations(DEFAULT_NUM_SIMULATIONS);
      setShouldRefresh(false);
    }
  }, [
    shouldRefresh,
    setData,
    setMu,
    setSigma,
    setNumDays,
    setStartingValue,
    setNumSimulations,
  ]);

  useEffect(() => {
    if (!shouldRefresh) {
      const url = buildUrl(
        `/api/test?samples=${numSimulations}&size=${numDays}&mu=${
          Number(mu) / 10000.0
        }&sigma=${Number(sigma) / 10000.0}&starting_value=${startingValue}`
      );
      getBackendData(url)
        .then((data) => setData(data))
        .catch((err) => console.error(err));
    }
  }, [
    numSimulations,
    numDays,
    mu,
    sigma,
    startingValue,
    setData,
    shouldRefresh,
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-2 pt-8 md:p-24">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white text-center">
        {`The simulations below are running in Vercel's Rust runtime`}
      </h1>
      <div className="lg:mx-4">
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-200 text-left">
          Using Rust on the server allows for performant, low-overhead, and
          memory-safe compute-intensive applications, such as Monte Carlo
          simulations.
        </p>
        <p className="mt-6 text-lg leading-6 text-gray-600 dark:text-gray-200 text-left">
          {`Try out the different parameters below to see how quickly these are
          calculated and rendered. `}
          <span className="italic">{`It's insane!`}</span>
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
          value={DEFAULT_NUM_SIMULATIONS}
          onValueChange={(value) => {
            setNumSimulations(value);
          }}
        />
        <Slider
          id="num-days-slider"
          labelText="Number of days"
          step="10"
          max="100"
          min="10"
          value={DEFAULT_NUM_DAYS}
          onValueChange={(value) => {
            setNumDays(value);
          }}
        />
        <Slider
          id="mu-slider"
          labelText="μ"
          step="10"
          max="500"
          min="10"
          value={DEFAULT_MU}
          onValueChange={(value) => {
            setMu(value);
          }}
          divisor={100}
        />
        <Slider
          id="vol-slider"
          labelText="σ"
          step="10"
          max="5000"
          min="10"
          value={DEFAULT_SIGMA}
          onValueChange={(value) => {
            setSigma(value);
          }}
          divisor={100}
        />
        <Slider
          id="starting-value-slider"
          labelText="Starting value"
          step="1"
          max="100"
          min="1"
          value={DEFAULT_STARTING_VALUE}
          onValueChange={(value) => {
            setStartingValue(value);
          }}
        />
      </div>
      <div className="pt-4 pb-4">
        <button
          className="transition duration-300 ease-in-out rounded-md hover:dark:bg-gray-800 active:text-black dark:border dark:border-gray-50 px-3 py-2 active:bg-black active:text-white dark:active:bg-gray-700 dark:active:text-gray-200"
          onClick={() => setShouldRefresh(true)}
        >
          Refresh data
        </button>
      </div>
    </main>
  );
}
