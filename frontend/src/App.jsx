import React, { useRef, useState, useEffect } from "react";
import {
  Palette,
  Eraser,
  RotateCcw,
  Download,
  Minus,
  Plus,
  Users,
  LogOut,
  MousePointer2,
} from "lucide-react";

export default function WhiteboardApp() {
  const canvasRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(8);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [currentStrokeId, setCurrentStrokeId] = useState(null);
  const [inRoom, setInRoom] = useState(false);
  const [roomInput, setRoomInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomId, setRoomId] = useState("");
  const handleRoomSubmit = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    setIsConnecting(true);
    setRoomId(roomInput.trim());
    setInRoom(true);
    setIsConnecting(false);
    setRoomInput("");
    if (socket) {
      socket.send(
        JSON.stringify({
          back_type: "join",
          room: roomInput.trim(),
        })
      );
    }
  };
  const leaveRoom = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          back_type: "leave",
          room: roomId,
        })
      );
      socket.close();
    }
    setInRoom(false);
    setStrokes([]);
    setCurrentStroke([]);
    setCurrentStrokeId(null);
    setSocket(null);
  };
  const colors = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
    "#800080",
    "#FFC0CB",
  ];

  useEffect(() => {
    const wss = new WebSocket("https://whiteboard-dhq8.onrender.com");
    setSocket(wss);

    wss.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "clear") {
        setStrokes([]);
        return;
      }

      if (data.type === "erase") {
        const strokeId = data.stroke;
        setStrokes((prevStrokes) =>
          prevStrokes.filter((stroke) => stroke.id !== strokeId)
        );
        return;
      }

      if (data.type === "draw_start") {
        const newStroke = {
          id: data.strokeId,
          points: [data.point],
          color: data.color,
          brushSize: data.brushSize,
        };
        setStrokes((prevStrokes) => [...prevStrokes, newStroke]);
        return;
      }

      if (data.type === "draw_continue") {
        setStrokes((prevStrokes) =>
          prevStrokes.map((stroke) =>
            stroke.id === data.strokeId
              ? { ...stroke, points: [...stroke.points, data.point] }
              : stroke
          )
        );
        return;
      }

      if (data.type === "draw") {
        const strokeObj =
          typeof data.stroke === "string"
            ? JSON.parse(data.stroke)
            : data.stroke;
        setStrokes((prevStrokes) => [...prevStrokes, strokeObj]);
      }
    };
  }, []);
  useEffect(() => {
    if (!inRoom) return;
    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    resizeCanvas();

    const handleResize = () => resizeCanvas();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [inRoom]);

  useEffect(() => {
    if (inRoom) redrawCanvas();
  }, [strokes]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length > 1) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });

    // Draw current stroke in progress
    if (currentStroke.points && currentStroke.points.length > 1) {
      ctx.strokeStyle = currentStroke.color;
      ctx.lineWidth = currentStroke.brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);

      for (let i = 1; i < currentStroke.points.length; i++) {
        ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y);
      }
      ctx.stroke();
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getTouchPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY,
    };
  };

  // Function to check if a point is near a line segment
  const distanceToLineSegment = (point, lineStart, lineEnd) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    let param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Function to find which stroke was touched
  const findTouchedStroke = (point) => {
    const threshold = Math.max(20, brushSize * 2);

    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i];

      for (let j = 0; j < stroke.points.length - 1; j++) {
        const distance = distanceToLineSegment(
          point,
          stroke.points[j],
          stroke.points[j + 1]
        );

        if (distance <= threshold) {
          return i;
        }
      }
    }
    return -1;
  };

  const startDrawing = (pos) => {
    if (tool === "eraser") {
      const strokeIndex = findTouchedStroke(pos);
      if (strokeIndex !== -1) {
        if (socket) {
          socket.send(
            JSON.stringify({
              back_type: "send_message",
              type: "erase",
              stroke: strokes[strokeIndex].id,
              room: roomId,
            })
          );
        }
      }
      return;
    }

    // Start new stroke for pen tool
    setIsDrawing(true);
    const strokeId = Date.now() + Math.random(); // Generate unique stroke ID
    setCurrentStrokeId(strokeId);

    const newStroke = {
      id: strokeId,
      points: [pos],
      color: color,
      brushSize: brushSize,
    };
    setCurrentStroke(newStroke);

    // Send stroke start to other users
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "draw_start",
          back_type: "send_message",
          strokeId: strokeId,
          point: pos,
          color: color,
          brushSize: brushSize,
          room: roomId,
        })
      );
    }
  };

  const draw = (pos) => {
    if (!isDrawing || tool === "eraser") return;

    setCurrentStroke((prev) => ({
      ...prev,
      points: [...prev.points, pos],
    }));

    // Send new point to other users in real-time
    if (socket && currentStrokeId) {
      socket.send(
        JSON.stringify({
          type: "draw_continue",
          back_type: "send_message",
          strokeId: currentStrokeId,
          point: pos,
          room: roomId,
        })
      );
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentStroke.points.length > 0) {
      // Add the completed stroke to the strokes array
      setStrokes((prev) => [
        ...prev,
        { ...currentStroke, points: [...currentStroke.points] },
      ]);
    }
    setIsDrawing(false);
    setCurrentStroke([]);
    setCurrentStrokeId(null);
  };

  // Mouse events
  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    startDrawing(pos);
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    draw(pos);
  };

  const handleMouseUp = () => {
    stopDrawing();
  };

  // Touch events
  const handleTouchStart = (e) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    startDrawing(pos);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    draw(pos);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  const clearCanvas = () => {
    if (socket) {
      socket.send(
        JSON.stringify({
          type: "clear",
          back_type: "send_message",
          room: roomId,
        })
      );
    }
    setStrokes([]);
    setCurrentStroke([]);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  const adjustBrushSize = (delta) => {
    setBrushSize((prev) => Math.max(1, Math.min(50, prev + delta)));
  };
  if (!inRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Collaborative Whiteboard
            </h1>
            <p className="text-gray-600">
              Enter a room ID to join or create a whiteboard session
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Room ID
              </label>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Enter room ID (e.g., room123)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={isConnecting}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleRoomSubmit(e);
                  }
                }}
              />
            </div>

            <button
              onClick={handleRoomSubmit}
              disabled={!roomInput.trim() || isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Connecting...
                </span>
              ) : (
                "Join Room"
              )}
            </button>

            <div className="text-center text-sm text-gray-500">
              <p>
                Share the same Room ID with others to collaborate in real-time!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-white border-b shadow-sm">
        {/* Tool Selection */}
        <div className="flex gap-2">
          <button
            onClick={() => setTool("pen")}
            className={`p-2 rounded-lg border-2 transition-colors ${
              tool === "pen"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:bg-gray-50"
            }`}
            title="Pen Tool"
          >
            <Palette size={20} />
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`p-2 rounded-lg border-2 transition-colors ${
              tool === "eraser"
                ? "border-red-500 bg-red-50"
                : "border-gray-300 hover:bg-gray-50"
            }`}
            title="Eraser Tool - Click on any line to remove it completely"
          >
            <Eraser size={20} />
          </button>
        </div>

        {/* Color Palette */}
        {tool === "pen" && (
          <div className="flex gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  color === c ? "border-gray-600 scale-110" : "border-gray-300"
                }`}
                style={{ backgroundColor: c }}
                title={`Color: ${c}`}
              />
            ))}
          </div>
        )}

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustBrushSize(-2)}
            className="p-1 rounded hover:bg-gray-100"
            title="Decrease brush size"
          >
            <Minus size={16} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-8 text-center">
              {brushSize}
            </span>
            <div
              className="rounded-full bg-current"
              style={{
                width: Math.max(4, Math.min(20, brushSize)),
                height: Math.max(4, Math.min(20, brushSize)),
                backgroundColor: tool === "pen" ? color : "#666",
              }}
            />
          </div>
          <button
            onClick={() => adjustBrushSize(2)}
            className="p-1 rounded hover:bg-gray-100"
            title="Increase brush size"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex mx-auto items-center gap-2  text-black text-lg bg-gray-200 font-semibold rounded-md px-5 py-2">
          Room ID : {roomId}
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition-colors"
            title="Clear Canvas"
          >
            <RotateCcw size={16} />
            Clear
          </button>
          <button
            onClick={downloadCanvas}
            className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            title="Download Image"
          >
            <Download size={16} />
            Download
          </button>
          <button
            onClick={leaveRoom}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Leave Room"
          >
            <LogOut size={16} />
            Leave Room
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-white border border-gray-300 rounded-lg shadow-sm"
          style={{
            touchAction: "none",
            cursor:
              tool === "pen"
                ? 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJibGFjayI+PHBhdGggZD0iTTEyLjU4NiAxMi41ODYgMTkgMTkiLz48cGF0aCBkPSJNMy42ODkgMy4wMzdhLjQ5Ny40OTcgMCAwIDAtLjY1MS42NTFsNi41IDE2YS41LjUgMCAwIDAgLjk0Ny0uMDYybDEuNTY5LTYuMDgzYTIgMiAwIDAgMSAxLjQ0OC0xLjQ3OWw2LjEyNC0xLjU3OWEuNS41IDAgMCAwIC4wNjMtLjk0N3oiLz48L3N2Zz4=") 2 2, auto'
                : 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMS4yNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1lcmFzZXItaWNvbiBsdWNpZGUtZXJhc2VyIj48cGF0aCBkPSJNMjEgMjFIOGEyIDIgMCAwIDEtMS40Mi0uNTg3bC0zLjk5NC0zLjk5OWEyIDIgMCAwIDEgMC0yLjgyOGwxMC0xMGEyIDIgMCAwIDEgMi44MjkgMGw1Ljk5OSA2YTIgMiAwIDAgMSAwIDIuODI4TDEyLjgzNCAyMSIvPjxwYXRoIGQ9Im01LjA4MiAxMS4wOSA4LjgyOCA4LjgyOCIvPjwvc3ZnPg==") 2 2, auto',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Instructions */}
      <div className="p-4 bg-white border-t text-sm text-gray-600">
        <p>
          <strong>Pen Tool:</strong> Click and drag to draw lines in real-time.
          <strong className="ml-4">Eraser Tool:</strong> Simply click on any
          line or stroke to remove it completely. All changes are synchronized
          in real-time with other users.
        </p>
      </div>
    </div>
  );
}
