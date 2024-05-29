"use client";
import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function LineChart({ data }: { data: { results?: number[][] } }) {
  if (typeof data?.results === "undefined") return null;
  const chartData = {
    labels: data.results[0].map((_, index) => index), // Assuming all series have the same length
    datasets: data?.results.map((series, index) => ({
      label: `Series ${index}`,
      data: series,
      borderColor: `hsl(${(index * 60) % 360}, 70%, 50%)`, // Different color for each series
      fill: false,
    })),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Line Chart of Series Data",
      },
    },
  };

  return <Line data={chartData} options={options} />;
}

export default LineChart;
