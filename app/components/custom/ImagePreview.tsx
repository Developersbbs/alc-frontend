import React, { useState, useRef, useEffect } from "react";

interface ImagePreviewProps {
  modalImage: string | null;
  imageRef: React.RefObject<HTMLImageElement>;
  drawCanvasRef: React.RefObject<HTMLCanvasElement>;
  isColorPicking: boolean;
  currentSettings: any;
  tool: "pen" | "eraser";
  handleImageMouseMove: (e: React.MouseEvent<HTMLImageElement>) => void;
  handleImageClickForColor: (e: React.MouseEvent<HTMLImageElement>) => void;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => void;
  endDrawing: () => void;
  setHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setRedoStack: React.Dispatch<React.SetStateAction<string[]>>;
  showRegionIndicators?: boolean;
  isGeneratedResult?: boolean;
  // Face detection and pattern props
  faceDetectionData?: any;
  selectedHairLineType?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  modalImage,
  imageRef,
  drawCanvasRef,
  isColorPicking,
  currentSettings,
  tool,
  handleImageMouseMove,
  handleImageClickForColor,
  startDrawing,
  draw,
  endDrawing,
  setHistory,
  setRedoStack,
  showRegionIndicators = false,
  isGeneratedResult = false,
  faceDetectionData,
  selectedHairLineType
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [selectedControlPoint, setSelectedControlPoint] = useState<number | null>(null);
  const [hairlinePoints, setHairlinePoints] = useState<Array<[number, number]>>([]);
  const [isDraggingCircle, setIsDraggingCircle] = useState(false);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [circleStartPoint, setCircleStartPoint] = useState<[number, number] | null>(null);
  const [isResizingCircle, setIsResizingCircle] = useState(false);
  const [circleCenterPoint, setCircleCenterPoint] = useState<[number, number] | null>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(true); // Start as true to block until face detection is complete
  // Function to get hair color variations based on the selected color from settings
  const getHairColorVariations = (baseColor: string) => {
    if (!baseColor) {
      return ['#2a1810', '#3d2317', '#4a2c1a', '#5d3621'];
    }

    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const variations = [];
    for (let i = 0; i < 4; i++) {
      const factor = 0.6 + (i * 0.3);
      const newR = Math.min(255, Math.max(0, Math.floor(r * factor)));
      const newG = Math.min(255, Math.max(0, Math.floor(g * factor)));
      const newB = Math.min(255, Math.max(0, Math.floor(b * factor)));
      
      const newHex = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      variations.push(newHex);
    }

    return variations;
  };

  const drawHairStrand = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: number | null = null) => {
    const colors = getHairColorVariations(currentSettings.hairColor);
    const baseColor = colors[Math.floor(Math.random() * colors.length)];
    
    const brushSize = currentSettings.brushSize ?? 40;
    const hairLength = currentSettings.hairLength ?? 80;
    const hairSoftness = currentSettings.hairSoftness ?? 6;
    const curlIntensity = currentSettings.curlIntensity ?? 0;
    const currentTexture = currentSettings.enhancedHairTexture ?? 'straight';

    let currentX = x + (Math.random() - 0.5) * (brushSize * 0.4);
    let currentY = y + (Math.random() - 0.5) * (brushSize * 0.4);

    const length = (hairLength * 0.7) + Math.random() * (hairLength * 0.6);
    let segments;
    switch(currentTexture) {
      case 'straight':
        segments = Math.max(4, Math.floor(length / 20));
        break;
      case 'wavy':
        segments = Math.max(8, Math.floor(length / 15));
        break;
      case 'curly':
        segments = Math.max(12, Math.floor(length / 10));
        break;
      default:
        segments = Math.max(6, Math.floor(length / 15));
    }
    let angle = direction || Math.random() * Math.PI * 2;
    const baseThickness = 0.8 + (brushSize / 200) * (1 + Math.random() * 0.8);
    const softnessFactor = hairSoftness / 10;
    
    const gradient = ctx.createLinearGradient(currentX, currentY, currentX + length * 0.3, currentY + length * 0.3);
    const alpha = Math.max(0.2, 0.9 - (softnessFactor * 0.4));
    
    gradient.addColorStop(0, baseColor + Math.floor(alpha * 100).toString(16));
    gradient.addColorStop(0.4, baseColor + Math.floor(alpha * 180).toString(16));
    gradient.addColorStop(0.8, baseColor + Math.floor(alpha * 220).toString(16));
    gradient.addColorStop(1, baseColor + Math.floor(alpha * 120).toString(16));
    
    ctx.filter = `blur(${softnessFactor * 0.8}px)`;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    
    let currentThickness = baseThickness;
    let wavePhase = Math.random() * Math.PI * 2;
    let curlPhase = Math.random() * Math.PI * 2;
    
    for (let i = 0; i < segments; i++) {
      const progress = i / segments;
      const segmentLength = length / segments;
      
      let angleChange = 0;
      
      switch(currentTexture) {
        case 'straight':
          angleChange = (Math.random() - 0.5) * 0.1;
          break;
        case 'wavy':
          wavePhase += 0.3;
          angleChange = Math.sin(wavePhase) * 0.4 + (Math.random() - 0.5) * 0.2;
          break;
        case 'curly':
          curlPhase += 0.5 + (curlIntensity / 10) * 0.8;
          angleChange = Math.sin(curlPhase) * 0.8 + Math.cos(curlPhase * 1.5) * 0.6;
          angleChange *= (1 + curlIntensity / 10);
          break;
      }
      
      angle += angleChange;
      
      currentThickness = baseThickness * (1 - progress * 0.5) + Math.random() * 0.3;
      ctx.lineWidth = Math.max(0.5, currentThickness);
      
      let nextX = currentX + Math.cos(angle) * segmentLength;
      let nextY = currentY + Math.sin(angle) * segmentLength;
      
      if (currentTexture === 'curly') {
        const spiralRadius = 2 + (curlIntensity / 10) * 8;
        nextX += Math.cos(curlPhase * 2) * spiralRadius * progress;
        nextY += Math.sin(curlPhase * 2) * spiralRadius * progress;
      } else if (currentTexture === 'wavy') {
        const waveAmplitude = 3 + Math.sin(progress * Math.PI) * 4;
        nextX += Math.cos(wavePhase) * waveAmplitude * 0.5;
        nextY += Math.sin(wavePhase) * waveAmplitude * 0.3;
      }
      
      if (i > segments * 0.6) {
        const gravityStrength = currentTexture === 'straight' ? 0.03 : 0.015;
        angle += gravityStrength * progress;
      }
      
      if (currentTexture === 'straight') {
        ctx.lineTo(nextX, nextY);
      } else {
        const controlX = (currentX + nextX) / 2 + (Math.random() - 0.5) * 3;
        const controlY = (currentY + nextY) / 2 + (Math.random() - 0.5) * 3;
        ctx.quadraticCurveTo(controlX, controlY, nextX, nextY);
      }
      
      currentX = nextX;
      currentY = nextY;
    }
    
    ctx.stroke();
    ctx.filter = 'none';
    
    if (currentTexture === 'curly' && Math.random() < 0.15) {
      ctx.filter = `blur(${softnessFactor * 1.2}px)`;
      ctx.strokeStyle = colors[colors.length - 1] + '60';
      ctx.lineWidth = baseThickness * 0.3;
      ctx.beginPath();
      const hlX = x + (Math.random() - 0.5) * (brushSize * 0.2);
      const hlY = y + (Math.random() - 0.5) * (brushSize * 0.2);
      ctx.moveTo(hlX, hlY);
      ctx.lineTo(hlX + length * 0.2 * Math.cos(angle), hlY + length * 0.2 * Math.sin(angle));
      ctx.stroke();
      ctx.filter = 'none';
    }
  };

  const drawHair = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    if (!isDrawing) return;
    
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((e.clientY - rect.top) * canvas.height) / rect.height;
    
    const dx = x - lastX;
    const dy = y - lastY;
    const direction = Math.atan2(dy, dx);
    
    const brushDensity = currentSettings.brushDensity ?? 25;
    const currentTexture = currentSettings.enhancedHairTexture ?? 'straight';
    let density = Math.max(1, Math.floor(brushDensity));
    if (currentTexture === 'curly') {
      density *= 0.7;
    }
    
    for (let i = 0; i < density; i++) {
      let directionVariation;
      switch(currentTexture) {
        case 'straight':
          directionVariation = 0.3;
          break;
        case 'wavy':
          directionVariation = 0.5;
          break;
        case 'curly':
          directionVariation = 0.8;
          break;
        default:
          directionVariation = 0.4;
      }
      const hairDirection = direction + (Math.random() - 0.5) * directionVariation;
      drawHairStrand(ctx, x, y, hairDirection);
    }
    
    setLastX(x);
    setLastY(y);
  };

  // UPDATED: Function to draw hairline patterns based on generate_hairlines_and_scalp_regions logic
  const drawHairlinePatterns = () => {
    const img = imageRef.current;
    const patternCanvas = patternCanvasRef.current;
    
    console.log("drawHairlinePatterns called:", {
      img: !!img,
      patternCanvas: !!patternCanvas,
      faceDetectionData: !!faceDetectionData,
      isFreeMark: currentSettings.isFreeMark,
      face_detected: faceDetectionData?.face_detection?.face_detected,
      face_bounds: faceDetectionData?.face_detection?.face_bounds,
      fullFaceData: faceDetectionData
    });
    
    if (!img || !patternCanvas || !faceDetectionData || currentSettings.isFreeMark) {
      console.log("Early return:", { img: !!img, patternCanvas: !!patternCanvas, faceDetectionData: !!faceDetectionData, isFreeMark: currentSettings.isFreeMark });
      return;
    }

    // Check if face was actually detected (nested in face_detection object)
    if (!faceDetectionData.face_detection?.face_detected) {
      console.log("Face not detected, skipping pattern draw");
      return;
    }

    const face_bounds = faceDetectionData.face_detection?.face_bounds;
    if (!face_bounds) {
      console.log("No face_bounds found, full data:", faceDetectionData);
      return;
    }

    console.log("Drawing patterns with face_bounds:", face_bounds);

    // Setup pattern canvas to match image exactly
    const imgRect = img.getBoundingClientRect();
    patternCanvas.width = img.naturalWidth;
    patternCanvas.height = img.naturalHeight;
    patternCanvas.style.width = `${img.offsetWidth}px`;
    patternCanvas.style.height = `${img.offsetHeight}px`;
    patternCanvas.style.position = "absolute";
    patternCanvas.style.top = "0";
    patternCanvas.style.left = "0";
    patternCanvas.style.pointerEvents = "auto";
    
    console.log("Canvas setup - Natural:", img.naturalWidth, "x", img.naturalHeight);
    console.log("Canvas setup - Display:", img.offsetWidth, "x", img.offsetHeight);

    const ctx = patternCanvas.getContext("2d");
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, patternCanvas.width, patternCanvas.height);

    // Extract face bounds (matching main.py generate_hairlines_and_scalp_regions logic)
    const face_left = face_bounds.left;
    const face_right = face_bounds.right;
    const face_top = face_bounds.top;
    const face_width = face_bounds.width;
    const face_height = face_bounds.height;
    const center_x = face_bounds.center_x;

    // Set drawing style
    ctx.strokeStyle = '#00FF00'; // Bright green
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]); // Dashed line
    ctx.globalAlpha = 0.8;

    // UPDATED: Show default M-Pattern when no specific type is selected or when "Hairline" is selected
    const effectiveHairLineType = selectedHairLineType || "Hairline";
    
    console.log("Drawing patterns for:", effectiveHairLineType, "Design:", currentSettings.hairlineDesign);

    switch (effectiveHairLineType) {
      case "Hairline":
        // Check for specific hairline design, default to M Pattern if none specified
        const hairlineDesign = currentSettings.hairlineDesign || "M Pattern";
 if (hairlineDesign === "M Pattern") {
  // Get default M Pattern points for inner and outer lines
  const defaultInnerPoints: Array<[number, number]> = [
    [face_left + face_width * 0.1, face_top - 20],     // Start point (left)
    [face_left + face_width * 0.25, face_top - 40],    // First peak
    [center_x, face_top - 10],                         // Center valley
    [face_right - face_width * 0.25, face_top - 40],   // Second peak
    [face_right - face_width * 0.1, face_top - 20],    // End point (right)
  ];

  // Create default outer points with larger offset
  const defaultOuterPoints: Array<[number, number]> = defaultInnerPoints.map(point => [
    point[0] - 15, 
    point[1] - 15
  ]);

  const innerPoints = hairlinePoints.slice(0, 5).length > 0 ? 
    hairlinePoints.slice(0, 5) : defaultInnerPoints;
  const outerPoints = hairlinePoints.slice(5).length > 0 ? 
    hairlinePoints.slice(5) : defaultOuterPoints;

  // Draw the combined M pattern with side connections
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#00FF00';
  ctx.beginPath();

  // Start with outer line (from left)
  ctx.moveTo(outerPoints[0][0], outerPoints[0][1]);
  
  // Draw outer M
  for (let i = 1; i < outerPoints.length; i++) {
    ctx.lineTo(outerPoints[i][0], outerPoints[i][1]);
  }

  // Connect to inner line on right side
  ctx.lineTo(innerPoints[4][0], innerPoints[4][1]);

  // Draw inner M from right to left
  for (let i = innerPoints.length - 2; i >= 0; i--) {
    ctx.lineTo(innerPoints[i][0], innerPoints[i][1]);
  }

  // Connect back to outer line on left side
  ctx.lineTo(outerPoints[0][0], outerPoints[0][1]);
  
  // Close the path
  ctx.closePath();
  
  // Fill with semi-transparent green
  ctx.fillStyle = '#00FF0022';
  ctx.fill();
  
  // Stroke the outline
  ctx.stroke();

  // Draw control points
  // Inner line control points (red)
  innerPoints.forEach((point, index) => {
    ctx.fillStyle = "#FF0000";
    ctx.beginPath();
    ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Outer line control points (blue)
  outerPoints.forEach((point, index) => {
    ctx.fillStyle = "#0000FF";
    ctx.beginPath();
    ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Initialize hairline points if not set
  if (hairlinePoints.length === 0) {
    setHairlinePoints([...defaultInnerPoints, ...defaultOuterPoints]);
  }
}
else if (hairlineDesign === "Z Pattern") {
  // IMPROVED: Z Pattern positioned to target receding hairline areas
  const defaultInnerPoints: Array<[number, number]> = [
    [face_left + face_width * 0.15, face_top - 25],   // Top-left (more conservative)
    [face_right - face_width * 0.15, face_top - 25],  // Top-right (more conservative)
    [face_left + face_width * 0.2, face_top - 5],     // Bottom-left (target temples)
    [face_right - face_width * 0.2, face_top - 5]     // Bottom-right (target temples)
  ];

  // Create default outer points with smaller, more targeted offset
  const defaultOuterPoints: Array<[number, number]> = defaultInnerPoints.map(point => [
    point[0] - 10, 
    point[1] - 10
  ]);

  const innerPoints = hairlinePoints.slice(0, 4).length > 0 ? 
    hairlinePoints.slice(0, 4) : defaultInnerPoints;
  const outerPoints = hairlinePoints.slice(4).length > 0 ? 
    hairlinePoints.slice(4) : defaultOuterPoints;

  // Draw the combined Z pattern with side connections
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#00FF00';
  ctx.beginPath();

  // Start with outer line from top-left
  ctx.moveTo(outerPoints[0][0], outerPoints[0][1]);
  
  // Draw outer Z
  for (let i = 1; i < outerPoints.length; i++) {
    ctx.lineTo(outerPoints[i][0], outerPoints[i][1]);
  }

  // Connect to inner line at bottom-right
  ctx.lineTo(innerPoints[3][0], innerPoints[3][1]);

  // Draw inner Z from bottom to top
  for (let i = innerPoints.length - 2; i >= 0; i--) {
    ctx.lineTo(innerPoints[i][0], innerPoints[i][1]);
  }

  // Connect back to outer line at top-left
  ctx.lineTo(outerPoints[0][0], outerPoints[0][1]);
  
  ctx.closePath();
  
  // Fill with semi-transparent green
  ctx.fillStyle = '#00FF0022';
  ctx.fill();
  
  ctx.stroke();

  // Draw control points
  // Inner line control points (red)
  innerPoints.forEach((point, index) => {
    ctx.fillStyle = "#FF0000";
    ctx.beginPath();
    ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Outer line control points (blue)
  outerPoints.forEach((point, index) => {
    ctx.fillStyle = "#0000FF";
    ctx.beginPath();
    ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  if (hairlinePoints.length === 0) {
    setHairlinePoints([...defaultInnerPoints, ...defaultOuterPoints]);
  }

} else {
  // Curved pattern with double lines
  const defaultInnerPoints: Array<[number, number]> = [
    [face_left + face_width * 0.1, face_top - 20],
    [face_left + face_width * 0.3, face_top - 15],
    [center_x, face_top - 10],
    [face_right - face_width * 0.3, face_top - 15],
    [face_right - face_width * 0.1, face_top - 20]
  ];

  // Create default outer points with larger offset
  const defaultOuterPoints: Array<[number, number]> = defaultInnerPoints.map(point => [
    point[0] - 15, 
    point[1] - 15
  ]);

  const innerPoints = hairlinePoints.slice(0, 5).length > 0 ? 
    hairlinePoints.slice(0, 5) : defaultInnerPoints;
  const outerPoints = hairlinePoints.slice(5).length > 0 ? 
    hairlinePoints.slice(5) : defaultOuterPoints;

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#00FF00';
  ctx.beginPath();

  // Start with outer curve from left
  ctx.moveTo(outerPoints[0][0], outerPoints[0][1]);
  
  // Draw outer curve
  for (let i = 1; i < outerPoints.length - 1; i++) {
    const xc = (outerPoints[i][0] + outerPoints[i + 1][0]) / 2;
    const yc = (outerPoints[i][1] + outerPoints[i + 1][1]) / 2;
    ctx.quadraticCurveTo(outerPoints[i][0], outerPoints[i][1], xc, yc);
  }
  ctx.quadraticCurveTo(
    outerPoints[outerPoints.length - 1][0],
    outerPoints[outerPoints.length - 1][1],
    outerPoints[outerPoints.length - 1][0],
    outerPoints[outerPoints.length - 1][1]
  );

  // Connect to inner curve at right end
  ctx.lineTo(innerPoints[innerPoints.length - 1][0], innerPoints[innerPoints.length - 1][1]);

  // Draw inner curve from right to left
  for (let i = innerPoints.length - 2; i > 0; i--) {
    const xc = (innerPoints[i][0] + innerPoints[i - 1][0]) / 2;
    const yc = (innerPoints[i][1] + innerPoints[i - 1][1]) / 2;
    ctx.quadraticCurveTo(innerPoints[i][0], innerPoints[i][1], xc, yc);
  }
  ctx.quadraticCurveTo(
    innerPoints[0][0],
    innerPoints[0][1],
    innerPoints[0][0],
    innerPoints[0][1]
  );

  // Connect back to outer curve at left end
  ctx.lineTo(outerPoints[0][0], outerPoints[0][1]);
  
  ctx.closePath();
  
  // Fill with semi-transparent green
  ctx.fillStyle = '#00FF0022';
  ctx.fill();
  
  ctx.stroke();

  // Draw control points
  // Inner line control points (red)
  innerPoints.forEach((point, index) => {
    ctx.fillStyle = "#FF0000";
    ctx.beginPath();
    ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Outer line control points (blue)
  outerPoints.forEach((point, index) => {
    ctx.fillStyle = "#0000FF";
    ctx.beginPath();
    ctx.arc(point[0], point[1], 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  if (hairlinePoints.length === 0) {
    setHairlinePoints([...defaultInnerPoints, ...defaultOuterPoints]);
  }
}
        break;

      case "Crown":
        // Crown with FILLED GREEN CIRCLE (like M pattern)
        const crown_y = face_top - (face_width * 0.5);
        const defaultCrownPoints: Array<[number, number]> = [
          [center_x, crown_y], // Center point
          [center_x + face_width * 0.4, crown_y], // Right edge
          [center_x - face_width * 0.4, crown_y], // Left edge
          [center_x, crown_y - face_width * 0.25], // Top edge
          [center_x, crown_y + face_width * 0.25]  // Bottom edge
        ];
        
        const crownPoints = hairlinePoints.length > 0 ? hairlinePoints : defaultCrownPoints;
        const center = crownPoints[0];
        const radiusX = Math.abs(crownPoints[1][0] - center[0]);
        const radiusY = Math.abs(crownPoints[3][1] - center[1]);
        
        // Draw FILLED GREEN crown circle (like M pattern solid coverage)
        const avgRadius = (radiusX + radiusY) / 2;
        ctx.beginPath();
        ctx.arc(center[0], center[1], avgRadius, 0, 2 * Math.PI);
        
        // Fill with semi-transparent green (like M pattern)
        ctx.fillStyle = '#00FF0030'; // 30% transparent green
        ctx.fill();
        
        // Stroke the outline
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw center point for dragging
        ctx.fillStyle = "#FF0000";
        ctx.beginPath();
        ctx.arc(center[0], center[1], 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw radius indicator
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(center[0], center[1]);
        ctx.lineTo(center[0] + avgRadius, center[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw edge point for radius adjustment
        ctx.fillStyle = "#0000FF";
        ctx.beginPath();
        ctx.arc(center[0] + avgRadius, center[1], 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (hairlinePoints.length === 0) {
          setHairlinePoints(defaultCrownPoints);
        }

        ctx.font = "16px Arial";
        ctx.fillStyle = "#00FF00";
        break;

      case "Mid Crown":
        // Mid Crown with FILLED GREEN CIRCLE (like M pattern)
        const mid_crown_y = face_top - (face_width * 0.5);
        const mid_crown_center_default = [center_x, mid_crown_y]; // Same as crown center
        const axes_mid_default = [face_width * 0.2, face_width * 0.2]; // Smaller circle
        
        const defaultMidCrownPoints: Array<[number, number]> = [
          [mid_crown_center_default[0], mid_crown_center_default[1]], // Center point
          [mid_crown_center_default[0] + axes_mid_default[0], mid_crown_center_default[1]], // Right edge
          [mid_crown_center_default[0] - axes_mid_default[0], mid_crown_center_default[1]], // Left edge
          [mid_crown_center_default[0], mid_crown_center_default[1] - axes_mid_default[1]], // Top edge
          [mid_crown_center_default[0], mid_crown_center_default[1] + axes_mid_default[1]]  // Bottom edge
        ];
        
        const midCrownPoints = hairlinePoints.length > 0 ? hairlinePoints : defaultMidCrownPoints;
        const midCenter = midCrownPoints[0];
        const midRadiusX = Math.abs(midCrownPoints[1][0] - midCenter[0]);
        const midRadiusY = Math.abs(midCrownPoints[3][1] - midCenter[1]);
        
        // Draw FILLED GREEN mid crown circle (like M pattern solid coverage)
        const midAvgRadius = (midRadiusX + midRadiusY) / 2;
        ctx.beginPath();
        ctx.arc(midCenter[0], midCenter[1], midAvgRadius, 0, 2 * Math.PI);
        
        // Fill with semi-transparent green (like M pattern)
        ctx.fillStyle = '#00FF0030'; // 30% transparent green
        ctx.fill();
        
        // Stroke the outline
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw center point for dragging
        ctx.fillStyle = "#FF0000";
        ctx.beginPath();
        ctx.arc(midCenter[0], midCenter[1], 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw radius indicator
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(midCenter[0], midCenter[1]);
        ctx.lineTo(midCenter[0] + midAvgRadius, midCenter[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw edge point for radius adjustment
        ctx.fillStyle = "#0000FF";
        ctx.beginPath();
        ctx.arc(midCenter[0] + midAvgRadius, midCenter[1], 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (hairlinePoints.length === 0) {
          setHairlinePoints(defaultMidCrownPoints);
        }

        ctx.font = "16px Arial";
        ctx.fillStyle = "#00FF00";
        break;

      case "Full Scalp":
        // Full Scalp with FILLED GREEN CIRCLE (like M pattern)
        const scalp_center_default = [center_x, face_top - face_height * 0.6];
        const axes_scalp_default = [face_width * 0.6, face_height * 0.9];
        
        const defaultFullScalpPoints: Array<[number, number]> = [
          [scalp_center_default[0], scalp_center_default[1]], // Center point
          [scalp_center_default[0] + axes_scalp_default[0], scalp_center_default[1]], // Right edge
          [scalp_center_default[0] - axes_scalp_default[0], scalp_center_default[1]], // Left edge
          [scalp_center_default[0], scalp_center_default[1] - axes_scalp_default[1]], // Top edge
          [scalp_center_default[0], scalp_center_default[1] + axes_scalp_default[1]]  // Bottom edge
        ];
        
        const fullScalpPoints = hairlinePoints.length > 0 ? hairlinePoints : defaultFullScalpPoints;
        const scalpCenter = fullScalpPoints[0];
        const scalpRadiusX = Math.abs(fullScalpPoints[1][0] - scalpCenter[0]);
        const scalpRadiusY = Math.abs(fullScalpPoints[3][1] - scalpCenter[1]);
        
        // Draw FILLED GREEN full scalp circle (like M pattern solid coverage)
        const scalpAvgRadius = (scalpRadiusX + scalpRadiusY) / 2;
        ctx.beginPath();
        ctx.arc(scalpCenter[0], scalpCenter[1], scalpAvgRadius, 0, 2 * Math.PI);
        
        // Fill with semi-transparent green (like M pattern)
        ctx.fillStyle = '#00FF0030'; // 30% transparent green
        ctx.fill();
        
        // Stroke the outline
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.stroke();


        // Draw center point for dragging
        ctx.fillStyle = "#FF0000";
        ctx.beginPath();
        ctx.arc(scalpCenter[0], scalpCenter[1], 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw radius indicator
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(scalpCenter[0], scalpCenter[1]);
        ctx.lineTo(scalpCenter[0] + scalpAvgRadius, scalpCenter[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw edge point for radius adjustment
        ctx.fillStyle = "#0000FF";
        ctx.beginPath();
        ctx.arc(scalpCenter[0] + scalpAvgRadius, scalpCenter[1], 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (hairlinePoints.length === 0) {
          setHairlinePoints(defaultFullScalpPoints);
        }

        ctx.font = "16px Arial";
        ctx.fillStyle = "#00FF00";
        break;
    }

    // Reset line dash
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;
  };

  // Setup canvas
  const setupCanvas = () => {
    const img = imageRef.current;
    const canvas = drawCanvasRef.current;
    if (!img || !canvas) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.width = `${img.offsetWidth}px`;
    canvas.style.height = `${img.offsetHeight}px`;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHistory([canvas.toDataURL()]);
      setRedoStack([]);
    }

    // Draw hairline patterns after canvas setup
    setTimeout(() => drawHairlinePatterns(), 10);
  };

  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete) {
      setupCanvas();
    }
  }, [modalImage, currentSettings.isFreeMark, selectedHairLineType, faceDetectionData]);

  // Clear hairline points and redraw when design changes
  useEffect(() => {
    console.log("Hairline design changed to:", currentSettings.hairlineDesign);
    setHairlinePoints([]); // Clear existing points to force new defaults
  }, [currentSettings.hairlineDesign, selectedHairLineType]);

  // UPDATED: Redraw patterns when face is detected or when selection changes
  useEffect(() => {
    if (faceDetectionData) {
      setIsProcessing(false); // Face detection is complete
      drawHairlinePatterns();
    } else {
      setIsProcessing(true); // Face detection is in progress
    }
  }, [selectedHairLineType, currentSettings.hairlineDesign, faceDetectionData, currentSettings.isFreeMark, hairlinePoints]);

  useEffect(() => {
    const handleResize = () => {
      setupCanvas();
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-4 lg:p-6 bg-black/20">
      <div className="relative inline-block max-w-full max-h-full lg:w-100">
        {/* Image + Canvas Container */}
        <div className="relative overflow-hidden rounded-lg">
          <div className="relative">
            <img
              ref={imageRef}
              src={modalImage || undefined}
              alt="Preview"
              className={`max-w-full max-h-[70vh] lg:max-h-[80vh] object-contain block ${isProcessing ? 'opacity-50' : ''}`}
              style={{
                cursor: isProcessing 
                  ? 'wait' 
                  : isColorPicking && !currentSettings.isFreeMark 
                    ? 'crosshair' 
                    : 'default',
                pointerEvents: isProcessing ? 'none' : 'auto'
              }}
              onMouseMove={!isProcessing ? handleImageMouseMove : undefined}
              onClick={!isProcessing ? handleImageClickForColor : undefined}
              onLoad={() => {
                setTimeout(() => {
                  setupCanvas();
                }, 10);
              }}
            />
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="text-white text-lg font-medium bg-black/70 px-4 py-2 rounded-lg">
                  Detecting face, please wait...
                </div>
              </div>
            )}
          </div>

          {/* UPDATED: Pattern Overlay Canvas - show when face detected and not in FreeMark mode */}
          {!currentSettings.isFreeMark && faceDetectionData?.face_detection?.face_detected && (
            <canvas
              ref={patternCanvasRef}
              data-hairline-pattern="true"
              className="absolute top-0 left-0 z-10"
              style={{
                width: "100%",
                height: "100%",
                pointerEvents: isColorPicking ? "none" : "auto",
                cursor: isColorPicking ? "crosshair" : "crosshair"
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                
                const rect = e.currentTarget.getBoundingClientRect();
                const canvasX = e.clientX - rect.left;
                const canvasY = e.clientY - rect.top;
                
                // Convert to canvas coordinates
                const x = (canvasX * e.currentTarget.width) / rect.width;
                const y = (canvasY * e.currentTarget.height) / rect.height;
                
                console.log("Canvas mousedown - Screen:", canvasX, canvasY, "Canvas:", x, y);
                
                // Find closest point for dragging
                if (hairlinePoints.length > 0) {
                  let closestPointIndex = -1;
                  let minDistance = Infinity;
                  
                  hairlinePoints.forEach((point, index) => {
                    const distance = Math.sqrt(Math.pow(x - point[0], 2) + Math.pow(y - point[1], 2));
                    if (distance < 80 && distance < minDistance) {
                      minDistance = distance;
                      closestPointIndex = index;
                    }
                  });
                  
                  if (closestPointIndex !== -1) {
                    setSelectedControlPoint(closestPointIndex);
                    setIsDraggingPoint(true);
                    console.log("✅ SELECTED point", closestPointIndex, "for dragging");
                  }
                }
              }}
              onMouseMove={(e) => {
                e.stopPropagation();
                
                const rect = e.currentTarget.getBoundingClientRect();
                const canvasX = e.clientX - rect.left;
                const canvasY = e.clientY - rect.top;
                
                // Convert to canvas coordinates
                const x = (canvasX * e.currentTarget.width) / rect.width;
                const y = (canvasY * e.currentTarget.height) / rect.height;
                
                // Handle circle patterns (Crown, Mid Crown, Full Scalp)
                if (e.buttons === 1 && ["Crown", "Mid Crown", "Full Scalp"].includes(selectedHairLineType || "") && isDraggingPoint) {
                  const center = hairlinePoints[0];
                  
                  if (selectedControlPoint === 0) {
                    // Moving the entire circle - update center position
                    const newCrownPoints: Array<[number, number]> = [...hairlinePoints];
                    const radius = Math.abs(hairlinePoints[1][0] - center[0]); // Keep existing radius
                    
                    newCrownPoints[0] = [x, y]; // New center
                    newCrownPoints[1] = [x + radius, y]; // Right
                    newCrownPoints[2] = [x - radius, y]; // Left
                    newCrownPoints[3] = [x, y - radius]; // Top
                    newCrownPoints[4] = [x, y + radius]; // Bottom
                    
                    setHairlinePoints(newCrownPoints);
                    setTimeout(() => drawHairlinePatterns(), 0);
                    return;
                  } 
                  else if (selectedControlPoint === 1) {
                    // Resizing the circle - keep center fixed, update radius
                    const newRadius = Math.abs(x - center[0]);
                    const newCrownPoints: Array<[number, number]> = [
                      center, // Keep existing center
                      [center[0] + newRadius, center[1]], // Right
                      [center[0] - newRadius, center[1]], // Left
                      [center[0], center[1] - newRadius], // Top
                      [center[0], center[1] + newRadius]  // Bottom
                    ];
                    
                    setHairlinePoints(newCrownPoints);
                    setTimeout(() => drawHairlinePatterns(), 0);
                    return;
                  }
                }
                
                // Handle control point dragging for regular patterns
                if (isDraggingPoint && selectedControlPoint !== null && selectedControlPoint !== -1 && hairlinePoints.length > selectedControlPoint) {
                  const newPoints = [...hairlinePoints];
                  newPoints[selectedControlPoint] = [x, y];
                  setHairlinePoints(newPoints);
                  
                  // Redraw pattern with updated points
                  setTimeout(() => drawHairlinePatterns(), 0);
                }
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                setIsDraggingPoint(false);
                setSelectedControlPoint(-1);
                
                if (isDraggingCircle) {
                  console.log("✅ FINISHED creating circle");
                  setIsDraggingCircle(false);
                  setCircleStartPoint(null);
                } else {
                  console.log("✅ FINISHED dragging point");
                }
              }}
            />
          )}

          {/* Drawing Canvas: only show for FreeMark mode */}
          {currentSettings.isFreeMark && (
            <canvas
              ref={drawCanvasRef}
              className="absolute top-0 left-0 z-5"
              style={{
                cursor: isColorPicking
                  ? "crosshair"
                  : tool === "pen"
                  ? "crosshair"
                  : tool === "eraser"
                  ? "grab"
                  : "default",
                pointerEvents: isColorPicking ? "none" : "auto",
              }}
              onMouseDown={(e) => {
                if (!isColorPicking) {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) * e.currentTarget.width) / rect.width;
                  const y = ((e.clientY - rect.top) * e.currentTarget.height) / rect.height;
                  setLastX(x);
                  setLastY(y);
                  setIsDrawing(true);
                  startDrawing(e);
                }
              }}
              onMouseMove={(e) => {
                if (!isColorPicking) {
                  if (tool === "pen") {
                    drawHair(e);
                  } else {
                    draw(e);
                  }
                }
              }}
              onMouseUp={() => {
                setIsDrawing(false);
                endDrawing();
              }}
              onMouseLeave={() => {
                setIsDrawing(false);
                endDrawing();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;