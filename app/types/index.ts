// types/index.ts

export type ImageSettings = {
  hairColor: string;
  hairLineType: string;
  hairDensity: number;
  hairType: string;
  isFreeMark: boolean;
  brushSize: number;
  colorFromImage: boolean;
  extractedColors: string[];
  tool: "pen" | "eraser";
  penColor?: string;
  canvasDrawing?: string;
  hasDrawing?: boolean;
  
  // New timeframe-specific properties
  hairDensity3M?: number; // Hair density for 3 months
  hairDensity8M?: number; // Hair density for 8 months
  densityTimeframe?: '3months' | '8months'; // Current timeframe being edited
  canvasDrawing_3months?: string; // Canvas drawing data for 3 months
  canvasDrawing_8months?: string; // Canvas drawing data for 8 months
  brushOpacity?: number; // Brush opacity for drawing
  color?: string; // Current brush color for FreeMark mode
};

export type UploadedImage = {
  src: string;
  file: File;
  name: string;
  status: "valid" | "invalid" | "validating";
  error?: string;
  generatedImage3Months?: string;
  generatedImage8Months?: string;
  settings: ImageSettings;
};

export type GenerationProgress = {
  current: number;
  total: number;
};

export type MousePosition = {
  x: number;
  y: number;
};

export type PredefinedColor = {
  color: string;
  label: string;
};

export type DrawingHandlers = {
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => void;
  endDrawing: () => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
};

export type ColorPickingHandlers = {
  handleImageMouseMove: (e: React.MouseEvent<HTMLImageElement>) => void;
  handleImageClickForColor: (e: React.MouseEvent<HTMLImageElement>) => void;
  handlePredefinedColorClick: (color: string) => void;
  handleWrongColor: (e: React.MouseEvent) => void;
};

// New types for API responses
export type GenerationResult = {
  success: boolean;
  data?: any;
  image: string; // Base64 encoded image
  request_id?: string;
  generation_method?: string;
  timeframe?: string;
  settings?: {
    hair_type?: string;
    hair_color?: string;
    hair_density_3m?: number;
    hair_density_8m?: number;
    current_hair_density?: number;
  };
  error?: string;
};

// Hook return types
export type UseHairGenerationReturn = {
  generateHair: (originalImageFile: File, currentSettings: ImageSettings, timeframe: string) => Promise<GenerationResult | null>;
  isGenerating: boolean;
  generationResult: GenerationResult | null;
  generationError: string | null;
  clearError: () => void;
  clearResult: () => void;
};