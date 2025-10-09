
import React, { useState } from "react";
import {
  X,
  ChevronDown,
  Sparkles,
  Pipette,
  Eraser,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface SettingsPanelProps {
  currentSettings: any;
  updateCurrentImageSettings: (updates: Partial<any>) => void;
  isColorPicking: boolean;
  setIsColorPicking: (v: boolean) => void;
  setPreviewColor: (v: string | null) => void;
  setMousePosition: (v: { x: number; y: number } | null) => void;
  setModalImage: (v: string | null) => void;
  setSelectedImageIndex: (v: number | null) => void;
  predefinedColors: { color: string; label: string }[];
  handlePredefinedColorClick: (color: string) => void;
  handleWrongColor: (e: React.MouseEvent) => void;
  previewColor: string | null;
  hoveredColor: string | null;
  hairTypeOpen: boolean;
  setHairTypeOpen: (v: boolean) => void;
  hairTypes: string[];
  history: string[];
  redoStack: string[];
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  drawCanvasRef: React.RefObject<HTMLCanvasElement>;
  // Face detection props
  faceDetected?: boolean;
  faceDetectionConfidence?: number;
  originalImage?: string;
  onTimeframeChange?: (timeframe: "3months" | "8months") => void;
  // Generation result props
  onGenerationComplete?: (result: any) => void;
  selectedImageIndex?: number | null;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentSettings,
  updateCurrentImageSettings,
  isColorPicking,
  setIsColorPicking,
  setPreviewColor,
  setMousePosition,
  setModalImage,
  predefinedColors,
  handlePredefinedColorClick,
  handleWrongColor,
  previewColor,
  hoveredColor,
  history,
  redoStack,
  undo,
  redo,
  clearCanvas,
  drawCanvasRef,
  faceDetected = false,
  faceDetectionConfidence = 0,
  originalImage,
  onTimeframeChange,
  onGenerationComplete,
  selectedImageIndex,
}) => {
  const [open, setOpen] = useState(false);
  const textures = ["straight", "wavy", "curly"];
  const [isOpen, setIsOpen] = useState(true);
  const [showHairlineDesigns, setShowHairlineDesigns] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // UPDATED: Set default values when face is detected and not in FreeMark mode
  React.useEffect(() => {
    if (!faceDetected && !currentSettings.isFreeMark) {
      // Force FreeMark mode if no face detected
      updateCurrentImageSettings({ 
        isFreeMark: true,
        hairLineType: "FreeMark" 
      });
    } else if (faceDetected && !currentSettings.isFreeMark) {
      // Set default hairline type and M-Pattern design when face is detected
      updateCurrentImageSettings({ 
        hairLineType: currentSettings.hairLineType || "Hairline",
        hairlineDesign: currentSettings.hairlineDesign || "M Pattern"
      });
    }
  }, [faceDetected, currentSettings.isFreeMark, updateCurrentImageSettings]);

  // Function to convert colored canvas to white mask for backend
  const convertToWhiteMask = (canvas: HTMLCanvasElement): string => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");

    if (!tempCtx) {
      console.error("Failed to get temp canvas context");
      return canvas.toDataURL("image/png", 1.0);
    }

    // Fill with black background
    tempCtx.fillStyle = "#000000";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Get original canvas image data
    const originalCtx = canvas.getContext("2d");
    if (!originalCtx) {
      console.error("Failed to get original canvas context");
      return canvas.toDataURL("image/png", 1.0);
    }

    const imageData = originalCtx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
    const data = imageData.data;
    const newImageData = tempCtx.createImageData(canvas.width, canvas.height);
    const newData = newImageData.data;

    // Convert any non-transparent pixel to white
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]; // Alpha channel

      if (alpha > 0) {
        // If pixel is not fully transparent
        // Set to white
        newData[i] = 255; // Red
        newData[i + 1] = 255; // Green
        newData[i + 2] = 255; // Blue
        newData[i + 3] = 255; // Alpha (fully opaque)
      } else {
        // Keep transparent (black background with transparent alpha)
        newData[i] = 0; // Red
        newData[i + 1] = 0; // Green
        newData[i + 2] = 0; // Blue
        newData[i + 3] = 0; // Alpha (fully transparent)
      }
    }

    // Put the processed image data
    tempCtx.putImageData(newImageData, 0, 0);

    return tempCanvas.toDataURL("image/png", 1.0);
  };

  // Enhanced capture function that stores both original and white mask, plus density values
  const captureCanvasDataEnhanced = () => {
    if (currentSettings.isFreeMark && drawCanvasRef.current) {
      const canvas = drawCanvasRef.current;

      try {
        // Get original colored version for editing purposes
        const originalDataURL = canvas.toDataURL("image/png", 1.0);

        // Convert to white mask for backend processing
        const whiteMaskDataURL = convertToWhiteMask(canvas);

        const timeframe = currentSettings.densityTimeframe || "3months";
        const currentBrushDensity = getCurrentDensity(); // Use the getCurrentDensity function

        updateCurrentImageSettings({
          [`canvasDrawing_${timeframe}`]: whiteMaskDataURL, // For backend
          [`canvasDrawing_${timeframe}_original`]: originalDataURL, // For editing
          [`densityValue_${timeframe}`]: currentBrushDensity, // Store density value used
          hasDrawing: true,
        });

        console.log(`Enhanced capture for ${timeframe}:`);
        console.log("- Original data URL length:", originalDataURL.length);
        console.log("- White mask data URL length:", whiteMaskDataURL.length);
        console.log("- Stored density value:", currentBrushDensity);

        return whiteMaskDataURL;
      } catch (error) {
        console.error("Error capturing enhanced canvas data:", error);
        return null;
      }
    }
    return null;
  };

  // Function to handle timeframe change in Free Mark mode
  const handleTimeframeChange = (newTimeframe: "3months" | "8months") => {
    // Save current canvas data before switching (including density)
    if (currentSettings.isFreeMark) {
      captureCanvasDataEnhanced();
    }

    // Get the appropriate density for the new timeframe
    const newDensity =
      newTimeframe === "3months"
        ? currentSettings.hairDensity3M || 25 // Direct value 1-80
        : currentSettings.hairDensity8M || 50; // Direct value 1-80

    // Update the timeframe and brush settings
    updateCurrentImageSettings({
      densityTimeframe: newTimeframe,
      brushOpacity: newDensity / 80, // Convert to 0-1 for opacity
      brushDensity: newDensity, // Keep raw 1-80 value
      needsTextureUpdate: true,
    });

    // Call the parent component's timeframe change handler
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe);
    }

    // Clear the current canvas to prepare for the new timeframe
    if (currentSettings.isFreeMark && drawCanvasRef.current) {
      const canvas = drawCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Load any existing drawing for the new timeframe
        const existingDrawing =
          currentSettings[`canvasDrawing_${newTimeframe}_original`];
        if (existingDrawing) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.onerror = () => {
            console.error(
              "Failed to load existing drawing for timeframe:",
              newTimeframe
            );
          };
          img.src = existingDrawing;
        }
      }
    }
  };

  // Get current density based on selected timeframe (for FreeMark)
  const getCurrentDensity = () => {
    if (currentSettings.isFreeMark) {
      const timeframe = currentSettings.densityTimeframe || "3months";
      return timeframe === "3months"
        ? currentSettings.hairDensity3M || 25 // Direct 1-80 value
        : currentSettings.hairDensity8M || 50; // Direct 1-80 value
    } else {
      // For hairline mode, use direct 1-80 values
      const timeframe = currentSettings.densityTimeframe || "3months";
      return timeframe === "3months"
        ? currentSettings.hairDensity3M || 25
        : currentSettings.hairDensity8M || 50;
    }
  };

  // Get brush opacity based on density (for FreeMark mode)
  const getBrushOpacity = () => {
    if (currentSettings.isFreeMark) {
      const density = getCurrentDensity();
      return Math.max(0.1, Math.min(1.0, density / 80)); // Convert 1-80 to 0.1-1.0
    }
    return 0.5; // Default for non-FreeMark
  };

  // Convert canvas data URL to File object for form submission
  const dataURLToFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const dataURLToBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Create combined image (original + green mask overlay)
  const createCombinedImage = async (maskCanvas: HTMLCanvasElement | null, maskDataURL?: string): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error("Failed to create canvas context");
    }

    // Load original image
    const originalImg = new Image();
    await new Promise((resolve, reject) => {
      originalImg.onload = resolve;
      originalImg.onerror = reject;
      originalImg.src = originalImage!;
    });

    canvas.width = originalImg.width;
    canvas.height = originalImg.height;

    // Draw original image
    ctx.drawImage(originalImg, 0, 0);

    // Create mask overlay if provided
    if (maskCanvas || maskDataURL) {
      const maskImg = new Image();
      const maskSrc = maskDataURL || maskCanvas!.toDataURL();
      
      await new Promise((resolve, reject) => {
        maskImg.onload = resolve;
        maskImg.onerror = reject;
        maskImg.src = maskSrc;
      });

      // Create a temporary canvas for the green overlay
      const overlayCanvas = document.createElement('canvas');
      const overlayCtx = overlayCanvas.getContext('2d');
      
      if (overlayCtx) {
        overlayCanvas.width = canvas.width;
        overlayCanvas.height = canvas.height;

        // Draw the mask
        overlayCtx.drawImage(maskImg, 0, 0, overlayCanvas.width, overlayCanvas.height);

        // Get image data and convert mask areas to exact green (#BCF473)
        const imageData = overlayCtx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];

          // If pixel has ANY opacity (is part of the mask)
          if (a > 10) {
            // Convert to EXACT green overlay #BCF473 (RGB: 188, 244, 115) with full opacity
            data[i] = 188;     // R = 0xBC
            data[i + 1] = 244; // G = 0xF4
            data[i + 2] = 115; // B = 0x73
            data[i + 3] = 255; // Full opacity for reliable detection
          } else {
            // Make fully transparent
            data[i + 3] = 0;
          }
        }

        overlayCtx.putImageData(imageData, 0, 0);

        // Draw the green overlay on top of the original image
        ctx.drawImage(overlayCanvas, 0, 0);
      }
    }

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      }, 'image/png');
    });
  };

  const hexToColorName = (hex: string): string => {
    try {
      // Remove # and normalize
      hex = hex.replace(/^#/, '');
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      // Convert RGB to HSL
      const rNorm = r / 255;
      const gNorm = g / 255;
      const bNorm = b / 255;
      
      const max = Math.max(rNorm, gNorm, bNorm);
      const min = Math.min(rNorm, gNorm, bNorm);
      const diff = max - min;
      
      let h = 0, s = 0;
      const l = (max + min) / 2;
      
      if (diff !== 0) {
        s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
        
        switch (max) {
          case rNorm: h = ((gNorm - bNorm) / diff + (gNorm < bNorm ? 6 : 0)) / 6; break;
          case gNorm: h = ((bNorm - rNorm) / diff + 2) / 6; break;
          case bNorm: h = ((rNorm - gNorm) / diff + 4) / 6; break;
        }
      }
      
      const hue = Math.round(h * 360);
      const sat = Math.round(s * 100);
      const light = Math.round(l * 100);
      
      // Special cases
      if (r === 0 && g === 0 && b === 0) return "Black";
      if (r === 255 && g === 255 && b === 255) return "White";
      if (light < 10 && sat < 5) return "Nearly Black";
      if (light > 95 && sat < 5) return "Nearly White";
      if (sat < 5 && light >= 10 && light < 30) return "Charcoal";
      if (sat < 5 && light >= 30 && light < 50) return "Dark Gray";
      if (sat < 5 && light >= 50 && light < 70) return "Gray";
      if (sat < 5 && light >= 70 && light < 85) return "Light Gray";
      if (sat < 5 && light >= 85 && light <= 95) return "Silver";
      
      // Browns
      if (hue >= 20 && hue <= 50 && sat >= 20 && sat <= 60 && light >= 20 && light <= 45) {
        if (light < 30) return "Dark Brown";
        if (light < 40) return "Brown";
        return "Light Brown";
      }
      
      // Hair colors
      if (hue >= 20 && hue <= 60) {
        if (sat >= 15 && sat <= 40 && light >= 75 && light <= 90) return "Blonde";
        if (sat >= 40 && sat <= 70 && light >= 60 && light <= 80) return "Golden";
        if (sat >= 20 && sat <= 50 && light >= 30 && light <= 50) return "Auburn";
      }
      
      // Special colors
      if ((hue >= 345 || hue <= 15) && sat >= 60) {
        if (light < 30) return "Dark Red";
        if (light >= 60) return "Pink";
        return "Red";
      }
      if (hue >= 90 && hue <= 150 && sat >= 50) {
        if (light < 30) return "Dark Green";
        if (light >= 70) return "Mint";
        return "Green";
      }
      if (hue >= 200 && hue <= 240 && sat >= 50) {
        if (light < 30) return "Navy";
        if (light >= 70) return "Sky Blue";
        return "Blue";
      }
      if (hue >= 270 && hue <= 300 && sat >= 40) {
        if (light < 30) return "Deep Purple";
        if (light >= 70) return "Lavender";
        return "Purple";
      }
      
      // Build descriptive name
      const parts: string[] = [];
      
      // Lightness
      if (light < 10) parts.push("Very Dark");
      else if (light < 25) parts.push("Dark");
      else if (light >= 75 && light < 90) parts.push("Light");
      else if (light >= 90) parts.push("Very Light");
      
      // Saturation
      if (light >= 15 && light <= 85) {
        if (sat < 10) parts.push("Grayish");
        else if (sat < 30) parts.push("Muted");
        else if (sat >= 70) parts.push("Bright");
      }
      
      // Hue
      if (sat < 10) parts.push("Gray");
      else if (hue >= 0 && hue < 15) parts.push("Red");
      else if (hue >= 15 && hue < 45) parts.push("Orange");
      else if (hue >= 45 && hue < 75) parts.push("Yellow");
      else if (hue >= 75 && hue < 135) parts.push("Green");
      else if (hue >= 135 && hue < 195) parts.push("Cyan");
      else if (hue >= 195 && hue < 255) parts.push("Blue");
      else if (hue >= 255 && hue < 315) parts.push("Purple");
      else if (hue >= 315 && hue < 345) parts.push("Magenta");
      else parts.push("Red");
      
      return parts.join(" ");
    } catch (error) {
      return "Unknown Color";
    }
  };

  const prepareSubmissionData = async (): Promise<FormData> => {
    const formData = new FormData();
  
    // Add the original image (keeping for backward compatibility)
    try {
      const response = await fetch(originalImage);
      const blob = await response.blob();
      formData.append("image", blob, "original_image.jpg");
    } catch (error) {
      console.error("Failed to prepare original image:", error);
      return null as any;
    }
    const hairColorHex = currentSettings.hairColor || "#000000";
  const hairColorName = hexToColorName(hairColorHex);
  
  const hairType = currentSettings.enhancedHairTexture ? 
    currentSettings.enhancedHairTexture.charAt(0).toUpperCase() + currentSettings.enhancedHairTexture.slice(1) + ' Hair' : 
    "Straight Hair";
  
  const hairLineType = currentSettings.isFreeMark ? "FreeMark" : (currentSettings.hairLineType || "Hairline");

  // Get density values with proper defaults (25 for 3M, 50 for 8M as per slider defaults)
  const density3M = currentSettings.hairDensity3M ?? 25;
  const density8M = currentSettings.hairDensity8M ?? 50;

  // Convert density values from 1-80 scale to 0-1 scale for backend (send normalized values directly)
const density3MNormalized = density3M / 80;  // Convert to 0-1 scale
const density8MNormalized = density8M / 80;  // Convert to 0-1 scale

const timeframe = currentSettings.densityTimeframe || "3months";

console.log("DEBUG - Density values:");
console.log("  Raw density3M:", density3M, typeof density3M);
console.log("  Raw density8M:", density8M, typeof density8M);
console.log("  Normalized density3M:", density3MNormalized, typeof density3MNormalized);
console.log("  Normalized density8M:", density8MNormalized, typeof density8MNormalized);
console.log("  String density3M:", density3MNormalized.toString(), typeof density3MNormalized.toString());
console.log("  String density8M:", density8MNormalized.toString(), typeof density8MNormalized.toString());

// DEBUG: Check if we're sending the right values
console.log("DEBUG - About to send to backend:");
console.log("  Sending density3M:", density3MNormalized.toString());
console.log("  Sending density8M:", density8MNormalized.toString());

// Send normalized values to backend
formData.append("hair_color", hairColorName);
formData.append("hair_type", hairType);
formData.append("hair_line_type", hairLineType);
formData.append("hair_density_3m", density3MNormalized.toString());  // ← Normalized value
formData.append("hair_density_8m", density8MNormalized.toString());  // ← Normalized value

console.log("  FormData entries:");
for (let pair of formData.entries()) {
  console.log("    ", pair[0] + ': ' + pair[1]);
}

formData.append("timeframe", timeframe);
formData.append("face_detected", faceDetected.toString());
  
    // Handle Hairline mode - send hairline pattern if applicable
    if (!currentSettings.isFreeMark) {
      const hairlinePattern = currentSettings.hairlineDesign || "M Pattern";
      console.log("  - Hairline Pattern:", hairlinePattern);
      formData.append("hairline_pattern", hairlinePattern);
      
      // For hairline patterns, send the pattern image as mask if available
      try {
        console.log("Looking for hairline pattern canvas...");
        const patternCanvas = document.querySelector('canvas[data-hairline-pattern="true"]') as HTMLCanvasElement;
        console.log("Pattern canvas found:", !!patternCanvas);
        
        if (patternCanvas) {
          console.log("Found hairline pattern canvas, capturing as mask...");
          console.log("Canvas dimensions:", patternCanvas.width, "x", patternCanvas.height);
          
          // Convert canvas to blob and add as mask
          await new Promise<void>((resolve) => {
            patternCanvas.toBlob((blob) => {
              if (blob) {
                console.log("Blob created, size:", blob.size, "bytes");
                formData.append("hairline_mask", blob, "hairline_pattern_mask.png");
                console.log("Added hairline pattern mask to form data");
              } else {
                console.log("Failed to create blob from canvas");
              }
              resolve();
            }, 'image/png');
          });
        } else {
          console.log("No hairline pattern canvas found, using coordinates fallback");
          console.log("Available canvases:", document.querySelectorAll('canvas').length);
          // Add hairline points if available
          if (currentSettings.hairlinePoints && currentSettings.hairlinePoints.length > 0) {
            formData.append("hairline_points", JSON.stringify({
              inner: currentSettings.hairlinePoints,
              outer: [] // Add outer points if needed
            }));
          }
        }
      } catch (error) {
        console.error("Error capturing hairline pattern mask:", error);
        // Fallback to points
        if (currentSettings.hairlinePoints && currentSettings.hairlinePoints.length > 0) {
          formData.append("hairline_points", JSON.stringify({
            inner: currentSettings.hairlinePoints,
            outer: []
          }));
        }
      }
    }
  
    // Handle FreeMark mode - ENHANCED: Direct canvas capture for both timeframes
    if (currentSettings.isFreeMark && drawCanvasRef.current) {
      console.log("📊 FreeMark mode: Capturing masks directly from canvas and stored data");

      const currentTimeframe = currentSettings.densityTimeframe || "3months";
      const canvas = drawCanvasRef.current;
      const ctx = canvas.getContext('2d');

      // Check if current canvas has content
      let hasCurrentCanvasContent = false;
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        hasCurrentCanvasContent = !imageData.data.every(x => x === 0);
      }

      console.log(`🔍 Current timeframe: ${currentTimeframe}, Canvas has content: ${hasCurrentCanvasContent}`);

      // Capture current canvas as the current timeframe mask
      if (hasCurrentCanvasContent) {
        const whiteMaskDataURL = convertToWhiteMask(canvas);

        // Convert to blob and add as current timeframe mask
        const maskBlob = dataURLToBlob(whiteMaskDataURL);
        formData.append(`mask_${currentTimeframe}`, maskBlob, `mask_${currentTimeframe}.png`);
        console.log(`✅ Added current canvas as ${currentTimeframe} mask:`, {
          size: maskBlob.size,
          type: maskBlob.type,
          dataURLLength: whiteMaskDataURL.length
        });
      }

      // Add the other timeframe mask from stored settings
      const otherTimeframe = currentTimeframe === "3months" ? "8months" : "3months";
      const otherMaskData = currentSettings[`canvasDrawing_${otherTimeframe}`];

      console.log(`🔍 Looking for stored ${otherTimeframe} mask:`, otherMaskData ? "FOUND" : "NOT FOUND");

      if (otherMaskData) {
        try {
          const otherCanvas = document.createElement('canvas');
          const otherCtx = otherCanvas.getContext('2d');
          if (otherCtx) {
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = otherMaskData;
            });

            otherCanvas.width = img.width;
            otherCanvas.height = img.height;
            otherCtx.drawImage(img, 0, 0);

            await new Promise<void>((resolve) => {
              otherCanvas.toBlob((blob) => {
                if (blob) {
                  formData.append(`mask_${otherTimeframe}`, blob, `mask_${otherTimeframe}.png`);
                  console.log(`✅ Added stored ${otherTimeframe} mask:`, {
                    size: blob.size,
                    type: blob.type,
                    sourceDataLength: otherMaskData.length
                  });
                }
                resolve();
              }, 'image/png');
            });
          }
        } catch (error) {
          console.error(`Error preparing ${otherTimeframe} mask:`, error);
        }
      } else {
        console.warn(`⚠️ No stored ${otherTimeframe} mask found - user needs to draw on both timeframes`);
      }
    } else if (currentSettings.isFreeMark) {
      console.warn("⚠️ FreeMark mode but no canvas reference available - using stored settings only");
      
      // Fallback: use stored settings if available
      if (currentSettings.canvasDrawing_3months) {
        try {
          const canvas3M = document.createElement('canvas');
          const ctx3M = canvas3M.getContext('2d');
          if (ctx3M) {
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = currentSettings.canvasDrawing_3months!;
            });
            
            canvas3M.width = img.width;
            canvas3M.height = img.height;
            ctx3M.drawImage(img, 0, 0);
            
            await new Promise<void>((resolve) => {
              canvas3M.toBlob((blob) => {
                if (blob) {
                  formData.append("mask_3months", blob, "mask_3months.png");
                  console.log("✅ Added fallback 3-month mask");
                }
                resolve();
              }, 'image/png');
            });
          }
        } catch (error) {
          console.error("Error preparing fallback 3-month mask:", error);
        }
      }
      
      if (currentSettings.canvasDrawing_8months) {
        try {
          const canvas8M = document.createElement('canvas');
          const ctx8M = canvas8M.getContext('2d');
          if (ctx8M) {
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = currentSettings.canvasDrawing_8months!;
            });
            
            canvas8M.width = img.width;
            canvas8M.height = img.height;
            ctx8M.drawImage(img, 0, 0);
            
            await new Promise<void>((resolve) => {
              canvas8M.toBlob((blob) => {
                if (blob) {
                  formData.append("mask_8months", blob, "mask_8months.png");
                  console.log("✅ Added fallback 8-month mask");
                }
                resolve();
              }, 'image/png');
            });
          }
        } catch (error) {
          console.error("Error preparing fallback 8-month mask:", error);
        }
      }
    }
  
    // ============ CREATE AND ADD REQUIRED IMAGE_3MONTHS AND IMAGE_8MONTHS ============
    console.log("📦 Creating combined images for backend...");
    
    try {
      if (!currentSettings.isFreeMark) {
        // ===== HAIRLINE MODE: Same image for both months =====
        console.log("🔹 Hairline mode: Creating single combined image for both timeframes");
        
        // Get the hairline pattern canvas/mask
        const patternCanvas = document.querySelector('canvas[data-hairline-pattern="true"]') as HTMLCanvasElement;
        
        // Create one combined image
        const combinedBlob = await createCombinedImage(patternCanvas);
        
        // Use the same image for both 3 months and 8 months
        formData.append("image_3months", combinedBlob, "combined_3months.png");
        formData.append("image_8months", combinedBlob, "combined_8months.png");
        
        console.log("✅ Hairline: Added same combined image for both timeframes");
        
      } else if (currentSettings.isFreeMark) {
        // ===== FREEMARK MODE: Separate combined images for each timeframe =====
        console.log("🔹 FreeMark mode: Creating separate combined images for each timeframe");

        // Create combined image for 3months timeframe
        let combined3MBlob: Blob | null = null;
        if (currentSettings.canvasDrawing_3months) {
          try {
            console.log("✅ FreeMark 3months: Creating combined image with mask");
            combined3MBlob = await createCombinedImage(null, currentSettings.canvasDrawing_3months);
          } catch (error) {
            console.error("Error creating 3months combined image:", error);
          }
        }

        if (combined3MBlob) {
          formData.append("image_3months", combined3MBlob, "combined_3months.png");
          console.log("✅ FreeMark: Added 3months combined image with mask");
        } else {
          console.warn("⚠️ FreeMark 3months: No mask available, creating combined image without mask");
          const combined3MNoMask = await createCombinedImage(null);
          formData.append("image_3months", combined3MNoMask, "combined_3months_nomask.png");
        }

        // Create combined image for 8months timeframe
        let combined8MBlob: Blob | null = null;
        if (currentSettings.canvasDrawing_8months) {
          try {
            console.log("✅ FreeMark 8months: Creating combined image with mask");
            combined8MBlob = await createCombinedImage(null, currentSettings.canvasDrawing_8months);
          } catch (error) {
            console.error("Error creating 8months combined image:", error);
          }
        }

        if (combined8MBlob) {
          formData.append("image_8months", combined8MBlob, "combined_8months.png");
          console.log("✅ FreeMark: Added 8months combined image with mask");
        } else {
          console.warn("⚠️ FreeMark 8months: No mask available, creating combined image without mask");
          const combined8MNoMask = await createCombinedImage(null);
          formData.append("image_8months", combined8MNoMask, "combined_8months_nomask.png");
        }
      }
    } catch (error) {
      console.error("❌ Error creating combined images:", error);
      // Fallback: send original image for both if combined image creation fails
      try {
        const response = await fetch(originalImage);
        const blob = await response.blob();
        formData.append("image_3months", blob, "original_3months.jpg");
        formData.append("image_8months", blob, "original_8months.jpg");
        console.log("⚠️ Fallback: Using original image for both timeframes");
      } catch (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw new Error("Failed to create combined images");
      }
    }
    // ============ END CREATE COMBINED IMAGES ============
  
    return formData;
  };
  return (
    <div className="w-full lg:w-96 bg-[#1E1E1E] border-t lg:border-t-0 lg:border-l border-yellow-400 p-4 flex flex-col relative overflow-y-auto max-h-[50vh] lg:max-h-none">
      {/* Close Button */}
      <button
        className="absolute top-2 right-2 text-white hover:text-yellow-400 z-20 transition-colors"
        onClick={() => setModalImage(null)}
      >
        <X size={20} />
      </button>
      <h3 className="text-base font-medium text-white mb-4 pr-8 text-center">
        Simulation Settings
      </h3>

      

      {/* Density Timeframe Toggle - Only show in Free Mark mode */}
      {currentSettings.isFreeMark && (
        <div className="mb-4">
          <label className="block text-white mb-2 font-medium text-sm">
            Preview Timeframe
          </label>
          <div className="flex items-center bg-[#333333] rounded-full p-1">
            <button
              className={`flex-1 py-2 px-4 rounded-full text-xs sm:text-sm font-medium transition-colors relative ${
                (currentSettings.densityTimeframe || "3months") === "3months"
                  ? "bg-yellow-400 text-black"
                  : "text-white hover:text-yellow-400"
              }`}
              onClick={() => handleTimeframeChange("3months")}
            >
              3 Months
              {currentSettings.canvasDrawing_3months && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#333333]" title="Mask drawn"></span>
              )}
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-full text-xs sm:text-sm font-medium transition-colors relative ${
                (currentSettings.densityTimeframe || "3months") === "8months"
                  ? "bg-yellow-400 text-black"
                  : "text-white hover:text-yellow-400"
              }`}
              onClick={() => handleTimeframeChange("8months")}
            >
              8 Months
              {currentSettings.canvasDrawing_8months && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#333333]" title="Mask drawn"></span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Hair Line Type Toggle - UPDATED */}
      <div className="mb-6">
        <div className="flex items-center mb-3 bg-[#333333] rounded-full p-1">
          <button
            className={`flex-1 py-2 px-4 rounded-full text-xs sm:text-sm font-medium transition-colors ${
              !currentSettings.isFreeMark
                ? "bg-yellow-400 text-black"
                : "text-white hover:text-yellow-400"
            } ${!faceDetected ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => {
              if (faceDetected) {
                updateCurrentImageSettings({ 
                  isFreeMark: false,
                  // Set default values when switching to Hair Line mode
                  hairLineType: currentSettings.hairLineType || "Hairline",
                  hairlineDesign: currentSettings.hairlineDesign || "M Pattern"
                });
              }
            }}
            disabled={!faceDetected}
            title={!faceDetected ? "Face detection required for Hair Line mode" : ""}
          >
            Hair Line
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-full text-xs sm:text-sm font-medium transition-colors ${
              currentSettings.isFreeMark
                ? "bg-yellow-400 text-black"
                : "text-white hover:text-yellow-400"
            }`}
            onClick={() => {
              updateCurrentImageSettings({ isFreeMark: true });
              // When switching to Free Mark mode, reset to original image
              if (onTimeframeChange) {
                onTimeframeChange(
                  currentSettings.densityTimeframe || "3months"
                );
              }
            }}
          >
            Free Mark
          </button>
        </div>

        {/* Hair Line Type Options - Only show if face detected and not FreeMark */}
        {!currentSettings.isFreeMark && faceDetected && (
          <div className="space-y-3">
            {/* Hair Line Type Buttons */}
            <div className="bg-[#333333] rounded-lg p-1 grid grid-cols-4 gap-1">
              {["Hairline", "Crown", "Full Scalp", "Mid Crown"].map((type) => (
                <button
                  key={type}
                  className={`py-2 px-2 sm:px-3 rounded-md text-xs transition-colors ${
                    (currentSettings.hairLineType || "Hairline") === type
                      ? "bg-yellow-400 text-black font-medium"
                      : "text-white hover:bg-[#444444]"
                  }`}
                  onClick={() => {
                    updateCurrentImageSettings({ hairLineType: type });
                    // Show hairline design selector only for Hairline type
                    if (type === "Hairline") {
                      setShowHairlineDesigns(true);
                    } else {
                      setShowHairlineDesigns(false);
                    }
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Hairline Design Selector - Only show when Hairline is selected */}
            {(currentSettings.hairLineType || "Hairline") === "Hairline" && (
              <div className="relative">
                <button
                  className="w-full flex items-center justify-between border border-yellow-400 text-yellow-400 py-2 px-3 rounded-lg hover:bg-[#333333] transition-colors text-sm"
                  onClick={() => setShowHairlineDesigns(!showHairlineDesigns)}
                >
                  <span>
                    Design: {currentSettings.hairlineDesign || "M Pattern"}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      showHairlineDesigns ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Hairline Design Options Dropdown */}
                {showHairlineDesigns && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-xl border border-gray-600 p-2 z-30">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-600">
                      <span className="text-white text-sm font-medium">
                        Hairline Design
                      </span>
                      <button
                        onClick={() => setShowHairlineDesigns(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {["M Pattern", "Z Pattern", "Curve"].map((design) => (
                        <button
                          key={design}
                          onClick={() => {
                            updateCurrentImageSettings({
                              hairlineDesign: design,
                            });
                            setShowHairlineDesigns(false);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${
                            (currentSettings.hairlineDesign || "M Pattern") ===
                            design
                              ? "bg-yellow-400 text-black"
                              : "text-white hover:bg-gray-700"
                          }`}
                        >
                          <div className="w-8 h-4 border border-gray-400 rounded flex items-center justify-center">
                            <svg className="w-6 h-3" viewBox="0 0 24 12">
                              {design === "M Pattern" && (
                                <path
                                  d="M2,8 L6,4 L10,6 L14,4 L18,6 L22,8"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  fill="none"
                                />
                              )}
                              {design === "Z Pattern" && (
                                <path
                                  d="M2,4 L6,8 L10,4 L14,8 L18,4 L22,8"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  fill="none"
                                />
                              )}
                              {design === "Curve" && (
                                <path
                                  d="M2,7 Q6,5 12,6 Q18,7 22,8"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  fill="none"
                                />
                              )}
                            </svg>
                          </div>
                          <span className="text-sm">{design}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* FreeMark Drawing Tools */}
        {currentSettings.isFreeMark && (
          <div className="flex items-center justify-center gap-2 bg-[#2a2a2a] border border-yellow-400 rounded-xl p-3">
            {/* Pen */}
            <button
              onClick={() => {
                const density = getCurrentDensity();
                updateCurrentImageSettings({
                  tool: "pen",
                  color: "#ffffff",
                  brushOpacity: getBrushOpacity(),
                  brushDensity: density,
                  needsTextureUpdate: true,
                });
              }}
              disabled={isColorPicking}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                currentSettings.tool === "pen"
                  ? "bg-yellow-400 text-black"
                  : "text-yellow-400 hover:text-yellow-300"
              } ${isColorPicking ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Pen"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21.7 7.3l-5-5a1 1 0 00-1.4 0l-1.8 1.8 6.4 6.4 1.8-1.8a1 1 0 000-1.4zM3 17.25V21h3.75l11-11.02-3.74-3.74L3 17.25z" />
              </svg>
            </button>

            {/* Eraser */}
            <button
              onClick={() => updateCurrentImageSettings({ tool: "eraser" })}
              disabled={isColorPicking}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                currentSettings.tool === "eraser"
                  ? "bg-yellow-400 text-black"
                  : "text-yellow-400 hover:text-yellow-300"
              } ${isColorPicking ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Eraser"
            >
              <Eraser className="w-5 h-5" />
            </button>

            {/* Undo */}
            <button
              onClick={undo}
              disabled={history.length === 0 || isColorPicking}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                history.length === 0 || isColorPicking
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-yellow-400 hover:text-yellow-300"
              }`}
              title="Undo"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 14l-5-5 5-5M4 9h11a7 7 0 110 14h-1"
                />
              </svg>
            </button>

            {/* Redo */}
            <button
              onClick={redo}
              disabled={redoStack.length === 0 || isColorPicking}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                redoStack.length === 0 || isColorPicking
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-yellow-400 hover:text-yellow-300"
              }`}
              title="Redo"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 14l5-5-5-5M20 9H9a7 7 0 100 14h1"
                />
              </svg>
            </button>

            {/* Clear */}
            <button
              onClick={clearCanvas}
              disabled={isColorPicking}
              className={`w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-400 transition-colors rounded ${
                isColorPicking ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title="Clear Canvas"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Brush Options - Only for FreeMark mode */}
      {currentSettings.isFreeMark && (
        <div className="mb-6 p-4 bg-[#33333] rounded-lg border border-yellow-400">
          {/* Header with toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-yellow-400 text-sm font-bold">Brush Options</h3>
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-yellow-400 transition-transform" />
            ) : (
              <ChevronRight className="w-5 h-5 text-yellow-400 transition-transform" />
            )}
          </button>

          {/* Collapsible content */}
          {isOpen && (
            <div className="mt-4 space-y-4">
              {/* Brush Size */}
              <div>
                <label className="block mb-2 text-xs uppercase tracking-wide text-yellow-300">
                  Brush Size
                </label>
                <input
                  type="range"
                  min="5"
                  max="200"
                  value={currentSettings.brushSize ?? 40}
                  onChange={(e) =>
                    updateCurrentImageSettings({
                      brushSize: Number(e.target.value),
                    })
                  }
                  className="w-full accent-yellow-400"
                />
                <span className="text-xs text-yellow-200">
                  {currentSettings.brushSize ?? 40}
                </span>
              </div>

              {/* Hair Density (1-80 range) */}
              <div>
                <label className="block mb-2 text-xs uppercase tracking-wide text-yellow-300">
                  Hair Density (
                  {(currentSettings.densityTimeframe || "3months") === "3months"
                    ? "3 Months"
                    : "8 Months"}
                  )
                </label>
                <input
                  type="range"
                  min="1"
                  max="80"
                  value={currentSettings.brushDensity ?? 25}
                  onChange={(e) => {
                    const newDensity = Number(e.target.value);
                    const timeframe =
                      currentSettings.densityTimeframe || "3months";

                    // Update both brush density and timeframe-specific density
                    updateCurrentImageSettings({
                      brushDensity: newDensity,
                      [`hairDensity${timeframe === "3months" ? "3M" : "8M"}`]:
                        newDensity,
                      brushOpacity: newDensity / 80, // Convert to opacity
                      needsTextureUpdate: true,
                    });
                  }}
                  className="w-full accent-yellow-400"
                />
                <span className="text-xs text-yellow-200">
                  {currentSettings.brushDensity ?? 25}
                </span>
              </div>

              {/* Hair Length */}
              <div>
                <label className="block mb-2 text-xs uppercase tracking-wide text-yellow-300">
                  Hair Length
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={currentSettings.hairLength ?? 80}
                  onChange={(e) =>
                    updateCurrentImageSettings({
                      hairLength: Number(e.target.value),
                    })
                  }
                  className="w-full accent-yellow-400"
                />
                <span className="text-xs text-yellow-200">
                  {currentSettings.hairLength ?? 80}
                </span>
              </div>
{/* 
              Hair Softness
              <div>
                <label className="block mb-2 text-xs uppercase tracking-wide text-yellow-300">
                  Hair Softness
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentSettings.hairSoftness ?? 6}
                  onChange={(e) =>
                    updateCurrentImageSettings({
                      hairSoftness: Number(e.target.value),
                    })
                  }
                  className="w-full accent-yellow-400"
                />
                <span className="text-xs text-yellow-200">
                  {currentSettings.hairSoftness ?? 6}
                </span>
              </div> */}

              {/* Curl Intensity */}
              {/* <div>
                <label className="block mb-2 text-xs uppercase tracking-wide text-yellow-300">
                  Curl Intensity
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={currentSettings.curlIntensity ?? 0}
                  onChange={(e) =>
                    updateCurrentImageSettings({
                      curlIntensity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-yellow-400"
                />
                <span className="text-xs text-yellow-200">
                  {currentSettings.curlIntensity ?? 0}
                </span>
              </div> */}
            </div>
          )}
        </div>
      )}

      {/* Hair Color Selection */}
      <div className="mb-6">
        <label className="block text-white mb-3 font-medium text-sm">
          Select Hair Color
        </label>
        <div className="flex gap-2 flex-wrap">
          {predefinedColors.map((item) => (
            <button
              key={item.color}
              className={`group relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${
                currentSettings.hairColor === item.color &&
                !currentSettings.colorFromImage
                  ? "border-yellow-400 scale-110"
                  : "border-transparent hover:border-gray-400"
              }`}
              style={{ backgroundColor: item.color }}
              onClick={() => handlePredefinedColorClick(item.color)}
            >
              <span className="sr-only">{item.label}</span>
              <div className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 text-xs bg-[#333333] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                {item.label}
              </div>
            </button>
          ))}
          {currentSettings.colorFromImage ? (
            <button
              className="group relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-yellow-400 scale-110 transition-all"
              style={{ backgroundColor: currentSettings.hairColor }}
              aria-label="Color from image"
            >
              <div className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 text-xs bg-[#333333] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                From Image
              </div>
              <span
                onClick={handleWrongColor}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center cursor-pointer"
                title="Wrong color? Pick again"
                role="button"
                aria-label="Wrong color? Pick again"
              >
                <X className="w-3 h-3 text-white" />
              </span>
            </button>
          ) : (
            <button
              className={`group relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                isColorPicking
                  ? "border-yellow-400 bg-yellow-400"
                  : "border-gray-400 hover:border-yellow-400 bg-[#333333]"
              }`}
              onClick={() => setIsColorPicking(true)}
              aria-label="Pick from image"
            >
              <Pipette
                className={`w-4 h-4 ${
                  isColorPicking ? "text-black" : "text-white"
                }`}
              />
              <div className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 text-xs bg-[#333333] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                Pick from image
              </div>
            </button>
          )}
        </div>
        {isColorPicking && (
          <div className="mt-4 p-4 bg-[#2a2a2a] rounded-lg border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-medium">Picked Color</h3>
              <button
                onClick={() => {
                  setIsColorPicking(false);
                  setPreviewColor(null);
                  setMousePosition(null);
                }}
                className="text-gray-400 hover:text-white"
                aria-label="Close color picker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {(previewColor || hoveredColor) && (
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border border-gray-500"
                    style={{
                      backgroundColor:
                        previewColor || hoveredColor || undefined,
                    }}
                  />
                  <span className="text-white text-xs">
                    {previewColor || hoveredColor}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hair Density Sliders - Only show for Hair Line mode */}
      {!currentSettings.isFreeMark && faceDetected && (
        <div className="mb-6">
          <label className="block text-white mb-3 font-medium text-sm">
            Hair Density (3 Months)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newDensity = Math.max(
                  1,
                  (currentSettings.hairDensity3M || 25) - 5
                );
                updateCurrentImageSettings({
                  hairDensity3M: newDensity,
                  // Update brush settings if currently on 3 months timeframe
                  ...(currentSettings.densityTimeframe === "3months" && {
                    brushOpacity: newDensity / 80,
                    brushDensity: newDensity,
                    needsTextureUpdate: true,
                  }),
                });
              }}
              className="text-white bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
            >
              –
            </button>
            <input
              type="range"
              min="1"
              max="80"
              step="1"
              value={currentSettings.hairDensity3M || 25}
              onChange={(e) => {
                const newDensity = parseInt(e.target.value, 10);
                updateCurrentImageSettings({
                  hairDensity3M: newDensity,
                  // Update brush settings if currently on 3 months timeframe
                  ...(currentSettings.densityTimeframe === "3months" && {
                    brushOpacity: newDensity / 80,
                    brushDensity: newDensity,
                    needsTextureUpdate: true,
                  }),
                });
              }}
              className="flex-1 accent-yellow-400"
            />
            <button
              onClick={() => {
                const newDensity = Math.min(
                  80,
                  (currentSettings.hairDensity3M || 25) + 5
                );
                updateCurrentImageSettings({
                  hairDensity3M: newDensity,
                  // Update brush settings if currently on 3 months timeframe
                  ...(currentSettings.densityTimeframe === "3months" && {
                    brushOpacity: newDensity / 80,
                    brushDensity: newDensity,
                    needsTextureUpdate: true,
                  }),
                });
              }}
              className="text-white bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
            >
              +
            </button>
          </div>
          <div className="text-center text-yellow-400 text-sm mt-1 font-medium">
            {currentSettings.hairDensity3M || 25}
          </div>

          {/* 8 Months */}
          <label className="block text-white mb-3 font-medium text-sm mt-6">
            Hair Density (8 Months)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newDensity = Math.max(
                  1,
                  (currentSettings.hairDensity8M || 50) - 5
                );
                updateCurrentImageSettings({
                  hairDensity8M: newDensity,
                  // Update brush settings if currently on 8 months timeframe
                  ...(currentSettings.densityTimeframe === "8months" && {
                    brushOpacity: newDensity / 80,
                    brushDensity: newDensity,
                    needsTextureUpdate: true,
                  }),
                });
              }}
              className="text-white bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
            >
              –
            </button>
            <input
              type="range"
              min="1"
              max="80"
              step="1"
              value={currentSettings.hairDensity8M || 50}
              onChange={(e) => {
                const newDensity = parseInt(e.target.value, 10);
                updateCurrentImageSettings({
                  hairDensity8M: newDensity,
                  // Update brush settings if currently on 8 months timeframe
                  ...(currentSettings.densityTimeframe === "8months" && {
                    brushOpacity: newDensity / 80,
                    brushDensity: newDensity,
                    needsTextureUpdate: true,
                  }),
                });
              }}
              className="flex-1 accent-yellow-400"
            />
            <button
              onClick={() => {
                const newDensity = Math.min(
                  80,
                  (currentSettings.hairDensity8M || 50) + 5
                );
                updateCurrentImageSettings({
                  hairDensity8M: newDensity,
                  // Update brush settings if currently on 8 months timeframe
                  ...(currentSettings.densityTimeframe === "8months" && {
                    brushOpacity: newDensity / 80,
                    brushDensity: newDensity,
                    needsTextureUpdate: true,
                  }),
                });
              }}
              className="text-white bg-gray-700 hover:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center"
            >
              +
            </button>
          </div>
          <div className="text-center text-yellow-400 text-sm mt-1 font-medium">
            {currentSettings.hairDensity8M || 50}
          </div>
        </div>
      )}

      {/* Hair Type Selection */}
      <div className="relative flex-1">
        <button
          className="w-full flex items-center justify-between border border-yellow-400 text-yellow-400 py-3 px-4 rounded-lg hover:bg-[#333333] transition-colors"
          onClick={() => setOpen(!open)}
        >
          <span className="text-xs sm:text-sm">
            {(currentSettings.enhancedHairTexture || "straight").toUpperCase()}
          </span>

          <ChevronDown
            size={18}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute w-full mt-1 bg-[#1a1a1a] rounded-lg shadow-xl z-30 py-1 border border-gray-600">
            {textures.map((texture) => (
              <button
                key={texture}
                onClick={() => {
                  updateCurrentImageSettings({ 
                    enhancedHairTexture: texture,
                    hairType: texture.charAt(0).toUpperCase() + texture.slice(1) + ' Hair'
                  });
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-xs sm:text-sm font-mono transition-colors rounded-md
                  ${currentSettings.enhancedHairTexture === texture
                    ? "bg-yellow-400 text-black shadow"
                    : "text-yellow-300 hover:bg-[#333333]"}
                `}
              >
                {texture.charAt(0).toUpperCase() + texture.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Save Settings Button */}
      <div className="mt-auto pt-4">
        <button
          className={`w-full font-bold py-3 px-6 rounded-full shadow-lg transition-all hover:shadow-xl flex items-center justify-center gap-2 ${
            isGenerating 
              ? "bg-gray-600 cursor-not-allowed" 
              : "bg-[#F9D50A] hover:bg-yellow-300 text-black"
          }`}
          disabled={isGenerating}
        onClick={async () => {
  try {
    setIsGenerating(true);  // Set loading state to true before saving

    // Debug: Check what data we have before preparing submission
    console.log("🔍 SAVE: Current settings before submission:");
    console.log("  - canvasDrawing_3months:", currentSettings.canvasDrawing_3months ? "EXISTS" : "MISSING");
    console.log("  - canvasDrawing_8months:", currentSettings.canvasDrawing_8months ? "EXISTS" : "MISSING");
    console.log("  - canvasDrawing_3months_original:", currentSettings.canvasDrawing_3months_original ? "EXISTS" : "MISSING");
    console.log("  - canvasDrawing_8months_original:", currentSettings.canvasDrawing_8months_original ? "EXISTS" : "MISSING");
    console.log("  - Current timeframe:", currentSettings.densityTimeframe || "3months");

    // Prepare submission data
    const submissionData = await prepareSubmissionData();
    if (!submissionData) {
      alert("Failed to prepare submission data. Please ensure you have an original image loaded.");
      setIsGenerating(false);  // Reset loading state on error
      return;
    }

    console.log("📤 SAVE: Sending data to backend...");
    // Send to save endpoint
    const response = await fetch("http://localhost:8000/save-settings", {
      method: "POST",
      body: submissionData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Save failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ SAVE: Settings saved successfully:", result);
    
    // Close modal and return to main page
    setModalImage(null);
    alert("Settings saved successfully!");

  } catch (error) {
    console.error("❌ SAVE: Error saving settings:", error);
    alert(`Error saving settings: ${(error as Error).message}`);
  } finally {
    setIsGenerating(false);  // Reset loading state whether save succeeded or failed
  }
}}
        >
          {isGenerating ? (
  <>
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Saving Settings...
  </>
) : (
  <>
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
    Save Settings
  </>
)}
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;