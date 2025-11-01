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

function LineChart({ data }: { data: { results?: number[][] } }) {
  if (typeof data?.results === "undefined") return null;
  const chartData = {
    labels: data.results[0].map((_, index) => index), // Assuming all series have the same length
    datasets: data?.results.map((series, index) => ({
      label: ``,
      data: series,
      borderColor: `hsl(${(index * 60) % 360}, 70%, 50%)`, // Different color for each series
      backgroundColor: `hsl(${(index * 60) % 360}, 70%, 30%)`,
    })),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: data.results.length < 50,
        position: "top",
        labels: {
          useBorderRadius: true,
          borderRadius: 5,
        },
        onClick: (e: any, legendItem: any, legend: any) => {
          const index = legendItem.datasetIndex;
          const ci = legend.chart;
          const meta = ci.getDatasetMeta(index);
          const dimColor = "rgba(128, 128, 128, 0.3)"; // Dull color
          if (ci.isDatasetVisible(index)) {
            ci.hide(index);
            legendItem.hidden = true;
          } else {
            ci.show(index);
            legendItem.hidden = false;
          }

          // Persist dim color for hidden items
          legend.legendItems.forEach((item: any, idx: number) => {
            const itemMeta = ci.getDatasetMeta(idx);
            item.fillStyle = itemMeta.hidden
              ? dimColor
              : itemMeta.controller.getDataset().backgroundColor;
          });
        },
      },
      title: {
        display: true,
        text: "Monte Carlo Simulations",
      },
      tooltip: {
        usePointStyle: true,
      },
    },
    elements: {
      line: {
        tension: 0.3,
      },
      point: {
        radius: 0,
        hitRadius: 30,
      },
    },
  };
  // @ts-ignore
  return <Line data={chartData} options={options} />;
}

export default React.memo(LineChart);
