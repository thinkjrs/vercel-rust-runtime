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
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type LineChartProps = {
  data: { results?: number[][]; labels?: string[] };
  title?: string;
};

function LineChart({ data, title }: LineChartProps) {
  if (!data?.results) return null;

  const chartData = {
    labels: data.results[0].map((_, index) => index),
    datasets: data.results.map((series, index) => ({
      label: data.labels?.[index] || `Series ${index + 1}`,
      data: series,
      borderColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
      backgroundColor: `hsl(${(index * 60) % 360}, 70%, 30%)`,
      borderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: data.results.length < 50,
        position: "top" as const,
        labels: {
          useBorderRadius: true,
          borderRadius: 5,
        },
      },
      title: {
        display: true,
        text: title || "Monte Carlo Simulations",
      },
      tooltip: { usePointStyle: true },
    },
    elements: {
      line: { tension: 0.3 },
      point: { radius: 0, hitRadius: 30 },
    },
  };

  // @ts-ignore
  return <Line data={chartData} options={options} />;
}

export default React.memo(LineChart);
