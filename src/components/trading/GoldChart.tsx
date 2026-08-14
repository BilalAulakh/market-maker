"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { CandleStick, GoldTick, TimeFrame } from "@/types/trading";
import { goldMarketFeed } from "@/lib/trading/market-feed";
import {
  BarChart3,
  LineChart,
  TrendingUp,
  TrendingDown,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MoveHorizontal,
} from "lucide-react";

interface GoldChartProps {
  currentTick: GoldTick;
}

// Compute Exponential Moving Average (EMA)
function calculateEMA(data: CandleStick[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const ema: (number | null)[] = [];
  let prevEMA: number | null = null;

  for (let i = 0; i < data.length; i++) {
    const close = data[i]!.close;
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((acc, c) => acc + c.close, 0);
      prevEMA = sum / period;
      ema.push(prevEMA);
    } else {
      prevEMA = close * k + prevEMA! * (1 - k);
      ema.push(prevEMA);
    }
  }
  return ema;
}

export function GoldChart({ currentTick }: GoldChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [timeframe, setTimeframe] = useState<TimeFrame>("1M");
  const [chartType, setChartType] = useState<"candles" | "line">("candles");
  const [showIndicators, setShowIndicators] = useState(true);
  const [candles, setCandles] = useState<CandleStick[]>([]);
  
  // Interactive X-Axis Pan & Zoom States
  const [visibleCount, setVisibleCount] = useState(50); // Zoom level
  const [scrollOffset, setScrollOffset] = useState(0); // 0 = at rightmost/live candle
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  const [hoveredCandle, setHoveredCandle] = useState<{
    candle: CandleStick;
    x: number;
    y: number;
  } | null>(null);

  // Subscribe to history & updates
  useEffect(() => {
    const history = goldMarketFeed.getHistory(timeframe);
    setCandles(history);

    const unsubscribe = goldMarketFeed.subscribeCandles((updated) => {
      setCandles((prev) => {
        if (prev.length === 0) return [updated];
        const last = prev[prev.length - 1];
        if (last && last.timestamp === updated.timestamp) {
          const next = [...prev];
          next[next.length - 1] = { ...updated };
          return next;
        } else {
          return [...prev.slice(-149), updated];
        }
      });
    });

    return () => unsubscribe();
  }, [timeframe]);

  // Sliced Visible Candles based on Pan/Zoom
  const visibleCandles = useMemo(() => {
    if (candles.length === 0) return [];
    const endIndex = Math.max(1, candles.length - scrollOffset);
    const startIndex = Math.max(0, endIndex - visibleCount);
    return candles.slice(startIndex, endIndex);
  }, [candles, visibleCount, scrollOffset]);

  const allEma9 = useMemo(() => calculateEMA(candles, 9), [candles]);
  const allEma21 = useMemo(() => calculateEMA(candles, 21), [candles]);

  const visibleEma9 = useMemo(() => {
    if (candles.length === 0) return [];
    const endIndex = Math.max(1, candles.length - scrollOffset);
    const startIndex = Math.max(0, endIndex - visibleCount);
    return allEma9.slice(startIndex, endIndex);
  }, [candles, allEma9, visibleCount, scrollOffset]);

  const visibleEma21 = useMemo(() => {
    if (candles.length === 0) return [];
    const endIndex = Math.max(1, candles.length - scrollOffset);
    const startIndex = Math.max(0, endIndex - visibleCount);
    return allEma21.slice(startIndex, endIndex);
  }, [candles, allEma21, visibleCount, scrollOffset]);

  // Zoom In / Out Handlers
  const handleZoom = useCallback((direction: "in" | "out") => {
    setVisibleCount((prev) => {
      if (direction === "in") return Math.max(15, prev - 10);
      return Math.min(120, prev + 10);
    });
  }, []);

  const resetView = () => {
    setScrollOffset(0);
    setVisibleCount(50);
  };

  // High DPI Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const priceAxisWidth = 74;
    const timeAxisHeight = 24;
    const chartWidth = width - priceAxisWidth;
    const chartHeight = height - timeAxisHeight;

    ctx.clearRect(0, 0, width, height);

    // Compute dynamic min/max based on VISIBLE candles
    const highs = visibleCandles.map((c) => c.high);
    const lows = visibleCandles.map((c) => c.low);
    const rawMin = Math.min(...lows);
    const rawMax = Math.max(...highs);
    const span = Math.max(rawMax - rawMin, 1.5);
    const minPrice = rawMin - span * 0.12;
    const maxPrice = rawMax + span * 0.12;
    const priceRange = maxPrice - minPrice;

    const maxVolume = Math.max(...visibleCandles.map((c) => c.volume), 100);

    const getY = (p: number) =>
      chartHeight * (1 - (p - minPrice) / priceRange);

    const slotWidth = chartWidth / visibleCandles.length;
    const candleWidth = Math.max(3, slotWidth * 0.72);

    // Background Horizontal Grid
    ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    const gridSteps = 6;
    for (let i = 0; i <= gridSteps; i++) {
      const p = minPrice + (priceRange / gridSteps) * i;
      const y = getY(p);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price labels on right axis
      ctx.fillStyle = "#64748b";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`$${p.toFixed(2)}`, chartWidth + 6, y + 3.5);
    }

    // Time Axis (X-Axis) Labels & Vertical Grid
    const timeStep = Math.max(1, Math.floor(visibleCandles.length / 6));
    visibleCandles.forEach((c, idx) => {
      if (idx % timeStep === 0) {
        const x = idx * slotWidth + slotWidth / 2;
        ctx.strokeStyle = "rgba(30, 41, 59, 0.3)";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, chartHeight);
        ctx.stroke();

        const d = new Date(c.timestamp);
        const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        ctx.fillStyle = "#64748b";
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText(timeStr, x, chartHeight + 16);
      }
    });

    // Volume Bars (Bottom 18% max)
    visibleCandles.forEach((c, idx) => {
      const x = idx * slotWidth + slotWidth / 2;
      const volHeight = (c.volume / maxVolume) * (chartHeight * 0.18);
      const isUp = c.close >= c.open;
      ctx.fillStyle = isUp ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)";
      ctx.fillRect(x - candleWidth / 2, chartHeight - volHeight, candleWidth, volHeight);
    });

    if (chartType === "candles") {
      // Draw Candlesticks
      visibleCandles.forEach((c, idx) => {
        const x = idx * slotWidth + slotWidth / 2;
        const isUp = c.close >= c.open;
        const bodyColor = isUp ? "#10b981" : "#ef4444";
        const wickColor = isUp ? "#34d399" : "#f87171";

        // Draw Wick
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, getY(c.high));
        ctx.lineTo(x, getY(c.low));
        ctx.stroke();

        // Draw Body
        const openY = getY(c.open);
        const closeY = getY(c.close);
        const top = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 1.5);

        ctx.fillStyle = bodyColor;
        ctx.fillRect(x - candleWidth / 2, top, candleWidth, bodyHeight);
      });
    } else {
      // Draw Area Line Chart
      ctx.beginPath();
      visibleCandles.forEach((c, idx) => {
        const x = idx * slotWidth + slotWidth / 2;
        const y = getY(c.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Fill Area
      ctx.lineTo(chartWidth, chartHeight);
      ctx.lineTo(0, chartHeight);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw EMAs if enabled
    if (showIndicators) {
      // EMA 9 (Cyan)
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      visibleEma9.forEach((val, idx) => {
        if (val !== null) {
          const x = idx * slotWidth + slotWidth / 2;
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      // EMA 21 (Gold)
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      started = false;
      visibleEma21.forEach((val, idx) => {
        if (val !== null) {
          const x = idx * slotWidth + slotWidth / 2;
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    // Live Current Price Tracker Line
    const curPriceNum = Number(currentTick.mid);
    const liveY = Math.min(Math.max(getY(curPriceNum), 8), chartHeight - 8);

    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, liveY);
    ctx.lineTo(chartWidth, liveY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pulsing circle at latest candle if in view
    if (scrollOffset === 0) {
      const lastX = (visibleCandles.length - 1) * slotWidth + slotWidth / 2;
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(lastX, liveY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Right Axis Price Tag Badge
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.roundRect(chartWidth + 3, liveY - 10, priceAxisWidth - 6, 20, 4);
    ctx.fill();

    ctx.fillStyle = "#090d16";
    ctx.font = "bold 10px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`$${curPriceNum.toFixed(2)}`, chartWidth + priceAxisWidth / 2, liveY + 3.5);

    // Crosshair Lines on Hover
    if (hoveredCandle) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoveredCandle.x, 0);
      ctx.lineTo(hoveredCandle.x, chartHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hoveredCandle.y);
      ctx.lineTo(chartWidth, hoveredCandle.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    visibleCandles,
    currentTick,
    chartType,
    showIndicators,
    visibleEma9,
    visibleEma21,
    hoveredCandle,
    scrollOffset,
  ]);

  const isPositiveChange = currentTick.change24h >= 0;

  return (
    <div className="flex flex-col bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md select-none">
      {/* Top Header */}
      <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Symbol and Price */}
        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shadow-amber-500/20 shrink-0">
              AU
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                  XAU/USD
                </h3>
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                  Gold
                </span>
              </div>
            </div>
          </div>

          {/* Current Rate Display */}
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white animate-in fade-in">
              ${currentTick.mid}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded-full ${
                isPositiveChange
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              }`}
            >
              {isPositiveChange ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" />
              )}
              {isPositiveChange ? "+" : ""}
              {currentTick.change24h}%
            </span>
          </div>
        </div>

        {/* Chart Toolbar: Scroll, Zoom & Timeframes */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5">
          {/* Scroll / Pan Reset Button if scrolled */}
          {scrollOffset > 0 && (
            <button
              onClick={resetView}
              className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono inline-flex items-center gap-1 transition-all animate-pulse cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Live</span>
            </button>
          )}

          {/* Timeframes */}
          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono shrink-0">
            {(["1M", "5M", "15M", "1H", "1D"] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  timeframe === tf
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator Toggle */}
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono inline-flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
              showIndicators
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 font-bold"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>EMA</span>
          </button>

          {/* Chart Type Toggle */}
          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 shrink-0">
            <button
              onClick={() => setChartType("candles")}
              title="Candlestick Chart"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                chartType === "candles"
                  ? "bg-slate-800 text-emerald-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("line")}
              title="Area Line Chart"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                chartType === "line"
                  ? "bg-slate-800 text-emerald-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 shrink-0">
            <button
              onClick={() => handleZoom("in")}
              title="Zoom In"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleZoom("out")}
              title="Zoom Out"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 24h Ticker Ribbon */}
      <div className="px-3.5 sm:px-5 py-1.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 overflow-x-auto gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <div>
            High: <strong className="text-white">${currentTick.high24h}</strong>
          </div>
          <div>
            Low: <strong className="text-white">${currentTick.low24h}</strong>
          </div>
          <div>
            Spread: <strong className="text-amber-400">{currentTick.spread}</strong>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
          <MoveHorizontal className="w-3 h-3 text-amber-400" />
          <span className="hidden sm:inline">Drag left/right to scroll • Wheel to zoom</span>
          <span className="sm:hidden">Drag to pan</span>
        </div>
      </div>

      {/* Main Canvas Area with Drag/Pan & Mouse Wheel Zoom */}
      <div className="relative w-full h-[300px] sm:h-[360px] md:h-[420px] p-2">
        <canvas
          ref={canvasRef}
          className={`w-full h-full block ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStartX(e.clientX);
            setDragStartOffset(scrollOffset);
          }}
          onMouseMove={(e) => {
            const canvas = canvasRef.current;
            if (!canvas || visibleCandles.length === 0) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const chartWidth = rect.width - 74;

            if (isDragging) {
              const deltaX = e.clientX - dragStartX;
              const slotWidth = chartWidth / visibleCount;
              const candleDelta = Math.round(deltaX / slotWidth);
              const maxOffset = Math.max(0, candles.length - visibleCount);
              const newOffset = Math.min(
                maxOffset,
                Math.max(0, dragStartOffset + candleDelta)
              );
              setScrollOffset(newOffset);
            }

            const idx = Math.floor((x / chartWidth) * visibleCandles.length);
            if (idx >= 0 && idx < visibleCandles.length) {
              setHoveredCandle({
                candle: visibleCandles[idx]!,
                x,
                y,
              });
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => {
            setIsDragging(false);
            setHoveredCandle(null);
          }}
          onWheel={(e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
              handleZoom("in");
            } else {
              handleZoom("out");
            }
          }}
          onDoubleClick={resetView}
        />

        {/* Live Hover Tooltip */}
        {hoveredCandle && (
          <div className="absolute top-4 left-4 p-2.5 rounded-xl bg-slate-900/95 border border-slate-700 text-[11px] font-mono text-slate-300 shadow-2xl backdrop-blur-md flex items-center gap-3.5 pointer-events-none">
            <span>O: <strong className="text-white">${hoveredCandle.candle.open}</strong></span>
            <span>H: <strong className="text-emerald-400">${hoveredCandle.candle.high}</strong></span>
            <span>L: <strong className="text-rose-400">${hoveredCandle.candle.low}</strong></span>
            <span>C: <strong className="text-white">${hoveredCandle.candle.close}</strong></span>
            <span>Vol: <strong className="text-amber-400">{hoveredCandle.candle.volume}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
