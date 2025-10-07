// hooks/useDrawing.ts
import { useRef, useState, useCallback } from 'react';
import { ImageSettings } from '../types';
import { getCanvasCoordinates } from '../utils/imageUtils';
import { UPLOAD_CONFIG } from '../constants/config';

export const useDrawing = (currentSettings: ImageSettings) => {
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const saveCanvasState = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const currentState = canvas.toDataURL();
    setHistory((prev) => [...prev, currentState]);            
    setRedoStack([]);
  }, []);

  const startDrawing = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | MouseEvent
  ) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctxRef.current = ctx;
    const coords = getCanvasCoordinates(e, drawCanvasRef);
    const baseSize = Math.max(canvas.width, canvas.height) / 100;
    const scaledBrushSize = currentSettings.brushSize * baseSize * UPLOAD_CONFIG.BRUSH_SIZE_SCALE;

    ctx.lineWidth = scaledBrushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (currentSettings.tool === "pen") {
      // In FreeMark mode, always use white pen color
      if (currentSettings.isFreeMark) {
        ctx.strokeStyle = currentSettings.penColor || "#ffffff";
      } else {
        // In regular mode, use the selected hair color
        ctx.strokeStyle = currentSettings.hairColor;
      }
      ctx.globalCompositeOperation = "source-over";
    } else if (currentSettings.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    }

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  }, [currentSettings]);

  const draw = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | MouseEvent
  ) => {
    if (!isDrawing || !ctxRef.current) return;
    const coords = getCanvasCoordinates(e, drawCanvasRef);
    ctxRef.current.lineTo(coords.x, coords.y);
    ctxRef.current.stroke();
  }, [isDrawing]);

  const endDrawing = useCallback(() => {
    if (ctxRef.current) {
      ctxRef.current.closePath();
    }
    setIsDrawing(false);
    // Save canvas state after each completed stroke
    saveCanvasState();
  }, [saveCanvasState]);

  const undo = useCallback(() => {
    if (history.length <= 1) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const currentState = canvas.toDataURL();
    setRedoStack((prev) => [currentState, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    const updatedHistory = history.slice(0, -1);
    const previousState = updatedHistory[updatedHistory.length - 1];

    if (previousState) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = previousState;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [history]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const currentState = canvas.toDataURL();
    setHistory((prev) => [...prev, currentState]);
    const nextState = redoStack[0];
    setRedoStack((prev) => prev.slice(1));

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = nextState;
  }, [redoStack]);

  const clearCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    saveCanvasState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [saveCanvasState]);

  return {
    drawCanvasRef,
    isDrawing,
    history,
    redoStack,
    setHistory,
    setRedoStack,
    startDrawing,
    draw,
    endDrawing,
    undo,
    redo,
    clearCanvas,
  };
};