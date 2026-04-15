"use client";

import { useMemo } from "react";
import { formatCO2Amount } from "@/lib/calculations/carbonFootprint";
import {
  ComparisonPeriod,
  getComparisonData,
} from "@/constants/globalAverages";

interface ComparisonChartProps {
  userFootprint: number;
  period: ComparisonPeriod;
  averageFootprint?: number;
  targetFootprint?: number;
  className?: string;
}

interface ComparisonBar {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

export default function ComparisonChart({
  userFootprint,
  period,
  averageFootprint,
  targetFootprint,
  className = "",
}: ComparisonChartProps) {
  const { average, target } = getComparisonData(period);
  const safeUserFootprint = Math.max(
    0,
    Number.isFinite(userFootprint) ? userFootprint : 0
  );
  const effectiveAverage = Math.max(0, averageFootprint ?? average.total);
  const effectiveTarget = Math.max(0, targetFootprint ?? target.total);

  const formatPercentageDelta = (baseline: number) => {
    if (baseline <= 0) {
      return "0.0%";
    }

    return `${Math.abs(((safeUserFootprint / baseline - 1) * 100)).toFixed(1)}%`;
  };

  const bars = useMemo<ComparisonBar[]>(() => {
    return [
      {
        label: "Your Footprint",
        value: safeUserFootprint,
        color: safeUserFootprint <= effectiveTarget ? "#10B981" : "#EF4444",
        bgColor:
          safeUserFootprint <= effectiveTarget ? "bg-green-50" : "bg-red-50",
        textColor:
          safeUserFootprint <= effectiveTarget
            ? "text-green-700"
            : "text-red-700",
        description:
          safeUserFootprint <= effectiveTarget
            ? "Below target"
            : "Above target",
      },
      {
        label: "Tampa Average",
        value: effectiveAverage,
        color: "#3B82F6",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        description: "Local annual baseline",
      },
      {
        label: "Target Goal",
        value: effectiveTarget,
        color: "#F59E0B",
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        description: "Reduction target",
      },
    ];
  }, [effectiveAverage, effectiveTarget, safeUserFootprint]);

  const maxValue = useMemo(
    () => Math.max(...bars.map((bar) => bar.value), 1),
    [bars]
  );

  const performanceStatus = useMemo(() => {
    if (safeUserFootprint <= effectiveTarget) {
      return {
        message: "Great job! You're below the target!",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      };
    }

    if (safeUserFootprint <= effectiveAverage) {
      return {
        message: "You're below average, but there's room for improvement!",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      };
    }

    return {
      message:
        "Your footprint is above average. Small changes can make a big difference!",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    };
  }, [effectiveAverage, effectiveTarget, safeUserFootprint]);

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-center text-xl font-bold text-gray-900">
          {period.charAt(0).toUpperCase() + period.slice(1)} Carbon Footprint
          Comparison
        </h3>
      </div>

      <div className="mb-6 space-y-4">
        {bars.map((bar) => {
          const widthPercent = `${Math.max((bar.value / maxValue) * 100, 2)}%`;

          return (
            <div key={bar.label} className={`rounded-xl p-4 ${bar.bgColor}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {bar.label}
                  </p>
                  <p className={`text-xs ${bar.textColor}`}>{bar.description}</p>
                </div>
                <span className="text-sm font-bold text-gray-800">
                  {formatCO2Amount(bar.value)}
                </span>
              </div>

              <div className="h-5 rounded-full bg-white/80">
                <div
                  className="h-5 rounded-full transition-all duration-500"
                  style={{
                    width: widthPercent,
                    backgroundColor: bar.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`rounded-lg border-2 p-4 ${performanceStatus.bgColor} ${performanceStatus.borderColor}`}
      >
        <p className={`mb-2 font-semibold ${performanceStatus.color}`}>
          {performanceStatus.message}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">vs Tampa Average:</span>
            <span
              className={`ml-2 font-semibold ${
                safeUserFootprint <= effectiveAverage
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {safeUserFootprint <= effectiveAverage ? "-" : "+"}
              {formatPercentageDelta(effectiveAverage)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">vs Target Goal:</span>
            <span
              className={`ml-2 font-semibold ${
                safeUserFootprint <= effectiveTarget
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {safeUserFootprint <= effectiveTarget ? "-" : "+"}
              {formatPercentageDelta(effectiveTarget)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
