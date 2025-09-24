export const PEAK_COLORS = {
  green: "#21C55E",
  blue: "#5FA5F9",
  highlight: "#ffffff",
  accent: "#21C55E", // Changed from #FFA500 to match green progression color
}

export const CHART_LAYOUT = {
  padding: {
    right: 10,
    bottom: 30,
    top: 50,
  },
}

export const CHART_INTERACTION = {
  mode: "nearest" as const,
  axis: "xy" as const,
  intersect: false,
}

export const CHART_SCALES = {
  x: {
    title: {
      color: "white",
      font: {
        size: 14,
        weight: "bold" as const,
      },
      padding: {
        top: 25,
      },
    },
    ticks: {
      color: "rgba(255, 255, 255, 0.7)",
      maxRotation: 0,
    },
    grid: {
      color: "rgba(255, 255, 255, 0.1)",
    },
    offset: false,
  },
  y: {
    title: {
      color: "white",
      font: {
        size: 14,
        weight: "bold" as const,
      },
    },
    grid: {
      color: "rgba(255, 255, 255, 0.1)",
    },
  },
  y1: {
    title: {
      font: {
        size: 12,
        weight: "bold" as const,
      },
    },
    min: 0,
    max: 200, // Changed max from 100 to 200 to extend Y axis range to 0-200%
    ticks: {
      stepSize: 40, // Changed stepSize from 20 to 40 to maintain appropriate tick intervals for the larger range
    },
    grid: {
      drawOnChartArea: false, // Don't draw grid lines to avoid interference
    },
  },
}

export const DATASET_STYLES = {
  trajectory: {
    borderWidth: {
      normal: 0.8,
      highlighted: 1.5,
    },
    pointRadius: {
      normal: 0.8,
      highlighted: 2,
    },
    pointHoverRadius: 3,
    pointBorderWidth: 0,
    tension: 0,
    fill: false,
    spanGaps: true,
  },
  average: {
    borderWidth: {
      normal: 3,
      highlighted: 4,
    },
    borderDash: {
      normal: [10, 5],
      highlighted: [8, 4],
    },
    pointRadius: {
      normal: 2.5,
      highlighted: 3,
    },
    pointHoverRadius: 5,
    pointBorderWidth: 0,
    tension: 0,
    fill: false,
    spanGaps: true,
    opacity: {
      normal: 1,
      dimmed: 0.7,
    },
  },
  progression: {
    borderWidth: {
      normal: 2,
      highlighted: 3,
    },
    borderDash: {
      normal: [5, 3],
      highlighted: [7, 4],
    },
    pointRadius: {
      normal: 1.5,
      highlighted: 2.5,
    },
    pointHoverRadius: 4,
    pointBorderWidth: 0,
    tension: 0,
    fill: false,
    spanGaps: true,
    opacity: {
      normal: 1,
      dimmed: 0.7,
    },
  },
}

export const LABEL_ALIGNMENT_STYLES = {
  fillStyle: "rgba(255, 255, 255, 0.7)",
  font: "12px sans-serif",
  yOffset: 20,
  alignments: ["left", "center", "right"] as const,
}
