"use client";

import { useState, useEffect } from "react";
import LineChart from "@/components/LineChart";
import { buildUrl } from "@/utils/build-url";

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
  const [shouldRefresh, setShouldRefresh] = useState(true);
  useEffect(() => {
    if (shouldRefresh) {
      getBackendData(buildUrl("/api/test?samples=10"))
        .then((data) => setData(data))
        .catch((err) => console.error(err));
      setShouldRefresh(false);
    }
  }, [shouldRefresh, setData]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
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
          Try out the different parameters below to see how quickly these are
          calculated and rendered. <span className="italic">It's insane!</span>
        </p>
      </div>
      <div className="py-8">
        <button
          className="transition duration-300 ease-in-out rounded-md hover:dark:bg-gray-800 active:text-black dark:border dark:border-gray-50 px-3 py-2 active:bg-black active:text-white dark:active:bg-gray-700 dark:active:text-gray-200"
          onClick={() => setShouldRefresh(true)}
        >
          Refresh data
        </button>
      </div>
      <LineChart data={data} />
    </main>
  );
}
