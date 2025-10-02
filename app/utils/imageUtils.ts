// utils/imageUtils.ts
import { UPLOAD_CONFIG } from '../constants/config';

export const extractColorsFromImage = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  imageRef: React.RefObject<HTMLImageElement | null>
): string[] => {
  if (!canvasRef.current || !imageRef.current) return [];

  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");
  const img = imageRef.current;

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  ctx?.drawImage(img, 0, 0);

  const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
  if (!imageData) return [];

  const colors: string[] = [];
  const step = Math.max(
    Math.floor(canvas.width / UPLOAD_CONFIG.CANVAS_STEP_SIZE),
    Math.floor(canvas.height / UPLOAD_CONFIG.CANVAS_STEP_SIZE)
  );

  for (let x = step; x < canvas.width; x += step) {
    for (let y = step; y < canvas.height; y += step) {
      const pixel = ctx?.getImageData(x, y, 1, 1).data;
      if (pixel) {
        const [r, g, b] = pixel;
        const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b)
          .toString(16)
          .slice(1)}`;
        if (!colors.includes(hexColor)) {
          colors.push(hexColor);
        }
      }
    }
  }

  return [...new Set(colors)].slice(0, UPLOAD_CONFIG.MAX_EXTRACTED_COLORS);
};

export const getColorAtPosition = (
  x: number,
  y: number,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  imageRef: React.RefObject<HTMLImageElement | null>
): string | null => {
  if (!canvasRef.current || !imageRef.current) return null;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");
  const img = imageRef.current;

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  ctx?.drawImage(img, 0, 0);

  const pixel = ctx?.getImageData(x, y, 1, 1).data;
  if (pixel) {
    const [r, g, b] = pixel;
    const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)}`;
    return hexColor;
  }
  return null;
};

export const getCanvasCoordinates = (
  e: React.MouseEvent<HTMLCanvasElement> | MouseEvent,
  drawCanvasRef: React.RefObject<HTMLCanvasElement>
) => {
  const canvas = drawCanvasRef.current;
  if (!canvas) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: mouseX * scaleX,
    y: mouseY * scaleY,
  };
};