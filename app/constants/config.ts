// constants/config.ts
import { ImageSettings, PredefinedColor } from '../types';

export const HAIR_TYPES = ["Curly Hair", "Straight Hair", "Wavy Hair"];

export const PREDEFINED_COLORS: PredefinedColor[] = [
  { color: "#F0E2B6", label: "Blonde" },
  { color: "#6F4E37", label: "Coffee Brown" },
  { color: "#808080", label: "Gray" },
  { color: "#964B00", label: "Brown" },
  { color: "#654321", label: "Dark Brown" },
  { color: "#000000", label: "Black" },
];

export const API_CONFIG = {
  BASE_URL: "http://localhost:8000",
  ENDPOINTS: {
    HEALTH: "/health",
    GENERATE_INDIVIDUAL: "/generate/individual",
    GENERATE_3MONTHS: "/generate-3months",
    GENERATE_8MONTHS: "/generate-8months",
  },
};

export const UPLOAD_CONFIG = {
  MAX_IMAGES: 4,
  CANVAS_STEP_SIZE: 10,
  MAX_EXTRACTED_COLORS: 12,
  BRUSH_SIZE_SCALE: 0.1,
};

export const getDefaultSettings = (): ImageSettings => ({
  hairColor: "#000000",
  hairLineType: "Hairline",
  hairDensity: 0.5,
  hairType: "Straight Hair",
  isFreeMark: false,
  brushSize: 10,
  colorFromImage: false,
  extractedColors: [],
  tool: "pen",
  canvasDrawing: undefined,
  hasDrawing: false,
});