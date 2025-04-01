"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { Card, CardContent } from "@/components/ui/card";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Interfaces
interface ChartDisplayProps {
  data: any[];
  type: "bar" | "line" | "pie";
  xKey: string;
  yKeys: string[];
  title?: string;
  height?: number;
}

export default function ChartDisplay({
  data,
  type,
  xKey,
  yKeys,
  title,
  height = 300,
}: ChartDisplayProps) {
  const [chartData, setChartData] = useState<any>(null);
  const [options, setOptions] = useState<ChartOptions<any>>({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: !!title,
        text: title,
      },
    },
  });

  // Generate colors
  const generateColors = (count: number) => {
    const baseColors = [
      "rgba(54, 162, 235, 0.6)",
      "rgba(255, 99, 132, 0.6)",
      "rgba(75, 192, 192, 0.6)",
      "rgba(255, 159, 64, 0.6)",
      "rgba(153, 102, 255, 0.6)",
      "rgba(255, 205, 86, 0.6)",
      "rgba(201, 203, 207, 0.6)",
    ];
    
    return Array(count)
      .fill(0)
      .map((_, i) => baseColors[i % baseColors.length]);
  };

  // Prepare chart data
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Get labels from data using xKey
    const labels = data.map((item) => item[xKey]);
    const colors = generateColors(yKeys.length);

    if (type === "pie" && yKeys.length > 0) {
      // For pie charts, we use a single yKey
      const primaryKey = yKeys[0];
      
      setChartData({
        labels,
        datasets: [
          {
            data: data.map((item) => item[primaryKey]),
            backgroundColor: generateColors(data.length),
            borderColor: generateColors(data.length).map(color => 
              color.replace("0.6", "1")
            ),
            borderWidth: 1,
          },
        ],
      });
    } else {
      // For bar and line charts
      setChartData({
        labels,
        datasets: yKeys.map((key, index) => ({
          label: key.replace(/_/g, " "),
          data: data.map((item) => item[key]),
          backgroundColor: colors[index],
          borderColor: type === "line" ? colors[index].replace("0.6", "1") : undefined,
          borderWidth: 1,
        })),
      });
    }
  }, [data, type, xKey, yKeys]);

  if (!chartData) {
    return (
      <div
        className="flex items-center justify-center bg-muted"
        style={{ height: `${height}px` }}
      >
        Loading chart...
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }}>
      {type === "bar" && <Bar data={chartData} options={options} />}
      {type === "line" && <Line data={chartData} options={options} />}
      {type === "pie" && <Pie data={chartData} options={options} />}
    </div>
  );
} 