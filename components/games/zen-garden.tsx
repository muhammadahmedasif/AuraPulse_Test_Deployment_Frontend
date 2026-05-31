"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo, Trash2, Hand, PenTool, Palette, Pencil, Eraser } from "lucide-react";

const items = [
  { type: "rock", icon: "🪨" },
  { type: "flower", icon: "🌸" },
  { type: "tree", icon: "🌲" },
  { type: "bamboo", icon: "🎋" },
  { type: "lantern", icon: "🏮" },
  { type: "koi", icon: "🐟" },
  { type: "torii", icon: "⛩️" },
  { type: "butterfly", icon: "🦋" },
  { type: "water", icon: "💧" },
];

const canvasColors = [
  { id: "sand", name: "Classic Sand", style: "radial-gradient(circle at center, #f0e6d2 0%, #e0d0b0 100%)", stroke: "#c2b092" },
  { id: "clay", name: "Warm Clay", style: "radial-gradient(circle at center, #ebdcd0 0%, #d9c3b0 100%)", stroke: "#b89f8a" },
  { id: "stone", name: "Cool Stone", style: "radial-gradient(circle at center, #e0e5e5 0%, #c4cccc 100%)", stroke: "#a3afaf" },
];

const pencilColors = [
  { id: "red", value: "#ef4444" },
  { id: "orange", value: "#f97316" },
  { id: "yellow", value: "#eab308" },
  { id: "green", value: "#22c55e" },
  { id: "blue", value: "#3b82f6" },
  { id: "purple", value: "#a855f7" },
  { id: "pink", value: "#ec4899" },
  { id: "black", value: "#1f2937" },
  { id: "white", value: "#f8fafc" },
];

type ToolMode = "place" | "rake";
type DrawingTool = "rake" | "pencil" | "eraser";
type Point = { x: number; y: number };
type PlacedItem = { id: number; type: string; icon: string; x: number; y: number };
type RakeLine = { 
  id: number; 
  points: Point[]; 
  type: DrawingTool;
  colorId?: string; 
  color?: string;
  width: number;
};
type HistoryAction = { type: "item" | "line"; id: number };

export function ZenGarden() {
  const [toolMode, setToolMode] = useState<ToolMode>("place");
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("rake");
  const [pencilColor, setPencilColor] = useState(pencilColors[0].value);
  const [selectedItem, setSelectedItem] = useState(items[0]);
  const [canvasColor, setCanvasColor] = useState(canvasColors[0]);
  
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [rakeLines, setRakeLines] = useState<RakeLine[]>([]);
  const [currentLine, setCurrentLine] = useState<RakeLine | null>(null);
  
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [nextId, setNextId] = useState(0);

  const eraseAt = (x: number, y: number) => {
    const eraseRadius = 25;
    
    setRakeLines(prev => prev.filter(line => 
      !line.points.some(p => Math.hypot(p.x - x, p.y - y) < eraseRadius)
    ));
    
    setPlacedItems(prev => prev.filter(item => 
      Math.hypot(item.x - x, item.y - y) >= eraseRadius
    ));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Prevent placing/drawing when clicking on a placed item unless using eraser
    if ((e.target as HTMLElement).closest('[data-item]') && !(toolMode === "rake" && drawingTool === "eraser")) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolMode === "place") {
      const newItem = { id: nextId, ...selectedItem, x, y };
      setPlacedItems([...placedItems, newItem]);
      setHistory([...history, { type: "item", id: nextId }]);
      setNextId(nextId + 1);
    } else if (toolMode === "rake") {
      if (drawingTool === "eraser") {
        eraseAt(x, y);
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        setCurrentLine({ 
          id: nextId, 
          points: [{ x, y }], 
          type: drawingTool,
          colorId: drawingTool === "rake" ? canvasColor.id : undefined,
          color: drawingTool === "pencil" ? pencilColor : undefined,
          width: drawingTool === "rake" ? 12 : 4
        });
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode === "rake") {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (drawingTool === "eraser") {
        if (e.buttons > 0) { // check if mouse button is down
          eraseAt(x, y);
        }
      } else if (currentLine) {
        const lastPoint = currentLine.points[currentLine.points.length - 1];
        if (Math.hypot(lastPoint.x - x, lastPoint.y - y) > 4) {
          setCurrentLine({
            ...currentLine,
            points: [...currentLine.points, { x, y }],
          });
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode === "rake" && drawingTool !== "eraser" && currentLine) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (currentLine.points.length > 1) {
        setRakeLines([...rakeLines, currentLine]);
        setHistory([...history, { type: "line", id: currentLine.id }]);
        setNextId(nextId + 1);
      }
      setCurrentLine(null);
    } else if (toolMode === "rake" && drawingTool === "eraser") {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const newHistory = [...history];
    const lastAction = newHistory.pop()!;
    
    if (lastAction.type === "item") {
      setPlacedItems(placedItems.filter((i) => i.id !== lastAction.id));
    } else {
      setRakeLines(rakeLines.filter((l) => l.id !== lastAction.id));
    }
    setHistory(newHistory);
  };

  const handleClear = () => {
    setPlacedItems([]);
    setRakeLines([]);
    setHistory([]);
  };

  const renderPath = (points: Point[]) => {
    if (points.length === 0) return "";
    return points.reduce(
      (acc, point, i) => (i === 0 ? `M ${point.x},${point.y}` : `${acc} L ${point.x},${point.y}`),
      ""
    );
  };

  const getStrokeColor = (colorId: string) => {
    return canvasColors.find(c => c.id === colorId)?.stroke || canvasColors[0].stroke;
  };

  return (
    <div className="space-y-4 w-full">
      {/* Top Toolbar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-primary/5 p-3 sm:p-4 rounded-xl">
        <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start w-full sm:w-auto">
          {/* Tool Mode Toggles */}
          <div className="flex gap-1 bg-background p-1 rounded-lg border">
            <button
              onClick={() => setToolMode("place")}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                toolMode === "place" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
              }`}
            >
              <Hand className="w-4 h-4" /> <span className="hidden sm:inline">Place</span>
            </button>
            <button
              onClick={() => setToolMode("rake")}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                toolMode === "rake" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
              }`}
            >
              <PenTool className="w-4 h-4" /> <span className="hidden sm:inline">Rake</span>
            </button>
          </div>

          {/* Canvas Color Selector */}
          <div className="flex gap-2 items-center bg-background p-1 rounded-lg border px-2">
            <Palette className="w-4 h-4 text-muted-foreground ml-1 hidden sm:block" />
            {canvasColors.map((c) => (
              <button
                key={c.id}
                onClick={() => setCanvasColor(c)}
                title={c.name}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  canvasColor.id === c.id ? "border-primary scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ background: c.style }}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-2 flex-1 sm:flex-none justify-center flex items-center gap-2 text-sm font-medium rounded-md bg-background border hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <Undo className="w-4 h-4" /> Undo
          </button>
          <button
            onClick={handleClear}
            disabled={history.length === 0}
            className="p-2 flex-1 sm:flex-none justify-center flex items-center gap-2 text-sm font-medium rounded-md bg-background border border-destructive/20 hover:bg-destructive/10 text-destructive disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Item Palette */}
        <AnimatePresence>
          {toolMode === "place" && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="grid grid-cols-2 content-start gap-2 h-fit overflow-hidden py-2 px-1"
            >
              {items.map((item) => (
                <motion.button
                  key={item.type}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-lg text-2xl transition-all shrink-0 ${
                    selectedItem.type === item.type 
                      ? "bg-primary/20 ring-2 ring-primary shadow-sm" 
                      : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  {item.icon}
                </motion.button>
              ))}
            </motion.div>
          )}

          {toolMode === "rake" && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex flex-col gap-4 overflow-hidden py-2 px-1 w-max"
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drawing Tools</p>
                <div className="flex gap-2 bg-background p-1 rounded-lg border">
                  <button 
                    onClick={() => setDrawingTool("rake")} 
                    title="Rake"
                    className={`p-2 rounded-md transition-all ${drawingTool === "rake" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"}`}
                  >
                    <PenTool className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDrawingTool("pencil")} 
                    title="Pencil"
                    className={`p-2 rounded-md transition-all ${drawingTool === "pencil" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDrawingTool("eraser")} 
                    title="Eraser"
                    className={`p-2 rounded-md transition-all ${drawingTool === "eraser" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"}`}
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {drawingTool === "pencil" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colors</p>
                  <div className="grid grid-cols-3 gap-2">
                    {pencilColors.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setPencilColor(c.value)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${pencilColor === c.value ? "border-primary scale-110" : "border-transparent hover:scale-110"}`}
                        style={{ backgroundColor: c.value }}
                        title={c.id}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Garden Canvas */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative flex-1 w-full h-[50vh] min-h-[300px] max-h-[500px] rounded-xl overflow-hidden shadow-inner border touch-none transition-colors duration-500"
          style={{
            background: canvasColor.style,
            cursor: toolMode === "place" ? "crosshair" : (drawingTool === "eraser" ? "not-allowed" : "crosshair")
          }}
        >
          {/* Render Rake Lines using SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <filter id="sand-texture">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
                <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.08 0" />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#sand-texture)" className="mix-blend-overlay opacity-40" />
            
            {rakeLines.map((line) => (
              <path
                key={line.id}
                d={renderPath(line.points)}
                fill="none"
                stroke={line.type === "pencil" ? line.color : getStrokeColor(line.colorId || canvasColor.id)}
                strokeWidth={line.width || 12}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm opacity-80"
              />
            ))}
            {currentLine && (
              <path
                d={renderPath(currentLine.points)}
                fill="none"
                stroke={currentLine.type === "pencil" ? currentLine.color : getStrokeColor(currentLine.colorId || canvasColor.id)}
                strokeWidth={currentLine.width || 12}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm opacity-80"
              />
            )}
          </svg>

          {/* Render Placed Items */}
          {placedItems.map((item) => (
            <motion.div
              key={item.id}
              data-item="true"
              drag={toolMode !== "rake" || drawingTool !== "eraser"}
              dragMomentum={false}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`absolute text-4xl cursor-grab active:cursor-grabbing drop-shadow-md ${
                item.type === "butterfly" ? "animate-pulse" : ""
              } ${toolMode === "rake" && drawingTool === "eraser" ? "cursor-not-allowed" : ""}`}
              style={{
                x: item.x - 20,
                y: item.y - 20,
                touchAction: "none"
              }}
              whileDrag={{ scale: 1.1, zIndex: 10 }}
            >
              {item.icon}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
