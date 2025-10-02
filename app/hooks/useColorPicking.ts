// hooks/useColorPicking.ts
import { useRef, useState, useCallback } from 'react';
import { MousePosition, ImageSettings } from '../types';
import { extractColorsFromImage, getColorAtPosition } from '../utils/imageUtils';

export const useColorPicking = (
  updateCurrentImageSettings: (updates: Partial<ImageSettings>) => void
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isColorPicking, setIsColorPicking] = useState<boolean>(false);
  const [mousePosition, setMousePosition] = useState<MousePosition | null>(null);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const extractColors = useCallback(() => {
    const colors = extractColorsFromImage(canvasRef, imageRef);
    updateCurrentImageSettings({ extractedColors: colors });
  }, [updateCurrentImageSettings]);

  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!isColorPicking || !imageRef.current) return;

    const img = imageRef.current;
    const rect = img.getBoundingClientRect();

    const x = Math.floor(
      ((e.clientX - rect.left) / rect.width) * img.naturalWidth
    );
    const y = Math.floor(
      ((e.clientY - rect.top) / rect.height) * img.naturalHeight
    );

    const color = getColorAtPosition(x, y, canvasRef, imageRef);
    if (color) {
      setPreviewColor(color);
    }

    setMousePosition({ x: e.clientX, y: e.clientY });
  }, [isColorPicking]);

  const handleImageClickForColor = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    console.log("🎨 Color picker clicked", { isColorPicking, hasImageRef: !!imageRef.current, hasCanvasRef: !!canvasRef.current });
    
    if (!isColorPicking) {
      console.log("❌ Color picking not active");
      return;
    }
    
    if (!imageRef.current) {
      console.log("❌ No image reference");
      return;
    }
    
    if (!canvasRef.current) {
      console.log("❌ No canvas reference");
      return;
    }

    const img = imageRef.current;
    const rect = img.getBoundingClientRect();

    const x = Math.floor(
      ((e.clientX - rect.left) / rect.width) * img.naturalWidth
    );
    const y = Math.floor(
      ((e.clientY - rect.top) / rect.height) * img.naturalHeight
    );

    console.log("🎯 Picking color at position:", { x, y, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });

    const color = getColorAtPosition(x, y, canvasRef, imageRef);
    console.log("🎨 Extracted color:", color);
    
    if (color) {
      updateCurrentImageSettings({
        hairColor: color,
        colorFromImage: true,
      });
      setPreviewColor(color);
      console.log("✅ Color set successfully:", color);
    } else {
      console.log("❌ Failed to extract color");
    }

    setIsColorPicking(false);
  }, [isColorPicking, updateCurrentImageSettings]);

  const handlePredefinedColorClick = useCallback((color: string) => {
    updateCurrentImageSettings({
      hairColor: color,
      colorFromImage: false,
    });
    setIsColorPicking(false);
  }, [updateCurrentImageSettings]);

  const handleWrongColor = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateCurrentImageSettings({ colorFromImage: false });
    setIsColorPicking(true);
    setTimeout(() => {
      extractColors();
    }, 100);
  }, [updateCurrentImageSettings, extractColors]);

  return {
    canvasRef,
    imageRef,
    isColorPicking,
    setIsColorPicking,
    mousePosition,
    setMousePosition,
    previewColor,
    setPreviewColor,
    hoveredColor,
    setHoveredColor,
    handleImageMouseMove,
    handleImageClickForColor,
    handlePredefinedColorClick,
    handleWrongColor,
    extractColors,
  };
};