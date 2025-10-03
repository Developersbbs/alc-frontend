"use client";
import React, { useState } from "react";
import { Sparkles } from "lucide-react";

// Components
import Footer from "./components/custom/footer";
import Header from "./components/custom/header";
import UploadArea from "./components/custom/UploadArea";
import InstructionsPanel from "./components/custom/InstructionsPanel";
import ColorPickerMagnifier from "./components/custom/ColorPickerMagnifier";
import ImagePreview from "./components/custom/ImagePreview";
import ComparisonResults from "./components/custom/comparisonResult";
import SettingsPanel from "./components/custom/SettingsPanel";

// Hooks
import { useImageManagement } from './hooks/useImageManagement';
import { useColorPicking } from './hooks/useColorPicking';
import { useDrawing } from './hooks/useDrawing';
import { useGeneration } from './hooks/useGeneration';

// Constants
import { HAIR_TYPES, PREDEFINED_COLORS } from './constants/config';

// Utils
import { getStatusIcon } from './utils/statusHelpers';

// Types
interface FaceDetectionResult {
  face_detection: {
    face_detected: boolean;
    confidence: number;
    error?: string;
  };
}

interface ImageClickResult {
  action: 'showResults' | 'switchToGeneration';
  image?: any;
}

export default function Home() {
  // Image management
  const {
    images,
    selectedImageIndex,
    modalImage,
    uploadError,
    fileInputRef,
    getCurrentImageSettings,
    updateCurrentImageSettings,
    setModalImage,
    setSelectedImageIndex,
    handleFiles: originalHandleFiles,
    handleRemove,
    handleImageClick,
    handleClearAll,
    updateImageWithGeneration,
  } = useImageManagement();

  // Face detection state - store results for each image by index
  const [faceDetectionResults, setFaceDetectionResults] = useState<{[key: number]: FaceDetectionResult}>({});

  // Color picking
  const {
    canvasRef,
    imageRef,
    isColorPicking,
    setIsColorPicking,
    mousePosition,
    setMousePosition,
    previewColor,
    setPreviewColor,
    hoveredColor,
    handleImageMouseMove,
    handleImageClickForColor,
    handlePredefinedColorClick,
    handleWrongColor,
  } = useColorPicking(updateCurrentImageSettings);

  // Drawing functionality
  const currentSettings = getCurrentImageSettings();
  const {
    drawCanvasRef,
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
  } = useDrawing(currentSettings);

  // Generation management
  const {
    isGenerating,
    generatingIndex,
    generationProgress,
    showResults,
    selectedResultImage,
    selectedTimeframe,
    setSelectedResultImage,
    setShowResults,
    setSelectedTimeframe,
    handleGenerateSingle,
    handleGenerate,
    handleTryAgain,
    resetGenerationState,
  } = useGeneration(images, updateImageWithGeneration, (error: Error) => {
    console.error("Generation error:", error);
  });

  // Local state for UI
  const [hairTypeOpen, setHairTypeOpen] = useState<boolean>(false);
  const [isMainGenerating, setIsMainGenerating] = useState<boolean>(false);
  const [mainGenerationProgress, setMainGenerationProgress] = useState<string>("");

  // Face detection function
  const detectFace = async (imageFile: File, imageIndex: number): Promise<FaceDetectionResult> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      console.log(`Starting face detection for image ${imageIndex}...`);
      const response = await fetch('http://localhost:8000/detect-face', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Face detection failed: ${response.status}`);
      }
      
      const result: FaceDetectionResult = await response.json();
      console.log(`Face detection result for image ${imageIndex}:`, result);
      
      // Store the result for this specific image
      setFaceDetectionResults(prev => ({
        ...prev,
        [imageIndex]: result
      }));
      
      return result;
    } catch (error) {
      console.error('Face detection failed:', error);
      const failureResult: FaceDetectionResult = { 
        face_detection: { 
          face_detected: false, 
          confidence: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        } 
      };
      
      setFaceDetectionResults(prev => ({
        ...prev,
        [imageIndex]: failureResult
      }));
      
      return failureResult;
    }
  };

  // Enhanced file handling with face detection
  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files) return;

    // First, let the original handler process the files
    const currentImageCount = images.length;
    await originalHandleFiles(files);

    // Then run face detection on each new image
    const fileArray = Array.from(files);
    for (let i = 0; i < fileArray.length; i++) {
      const imageIndex = currentImageCount + i;
      const file = fileArray[i];
      
      // Run face detection for this image
      await detectFace(file, imageIndex);
    }
  };

  // Enhanced clear all handler that resets everything including face detection
  const handleCompleteReset = (): void => {
    // Reset face detection results
    setFaceDetectionResults({});
    
    // Reset generation states
    setShowResults(false);
    setSelectedResultImage(null);
    setSelectedTimeframe("3 Months");
    
    // Create generation reset function
    const generationReset = (): void => {
      if (resetGenerationState && typeof resetGenerationState === 'function') {
        resetGenerationState();
      }
    };
    
    // Call the image management clear all with generation reset
    handleClearAll(generationReset);
  };

  // Enhanced remove handler to clean up face detection data
  const handleEnhancedRemove = (idx: number): void => {
    // Remove face detection result for this image
    setFaceDetectionResults(prev => {
      const newResults = { ...prev };
      delete newResults[idx];
      
      // Reindex remaining results
      const reindexedResults: {[key: number]: FaceDetectionResult} = {};
      Object.keys(newResults).forEach(key => {
        const oldIndex = parseInt(key);
        if (oldIndex > idx) {
          // Shift down indices that are higher than the removed index
          reindexedResults[oldIndex - 1] = newResults[oldIndex];
        } else if (oldIndex < idx) {
          // Keep indices that are lower than the removed index
          reindexedResults[oldIndex] = newResults[oldIndex];
        }
      });
      
      return reindexedResults;
    });
    
    // Call original remove handler
    handleRemove(idx);
  };

  // Event handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  const onImageClick = (img: any, idx: number): void => {
    const result: ImageClickResult | undefined = handleImageClick(img, idx, showResults);
    
    if (result?.action === 'showResults' && result.image) {
      setSelectedResultImage(result.image);
      setSelectedTimeframe(
        result.image.generatedImage3Months ? "3 Months" : "8 Months"
      );
    } else if (result?.action === 'switchToGeneration') {
      setShowResults(false);
      setSelectedResultImage(null);
      setSelectedTimeframe("3 Months");
    }
  };

  // Get face detection data for current selected image
  const getCurrentFaceDetection = (): FaceDetectionResult | null => {
    if (selectedImageIndex === null) return null;
    return faceDetectionResults[selectedImageIndex] || null;
  };

  // Derived state
  const validImages = images.filter((img: any) => img.status === "valid");
  const currentFaceDetection = getCurrentFaceDetection();
  
  const canGenerate = selectedImageIndex !== null && 
    images[selectedImageIndex]?.status === "valid" && 
    !isGenerating && 
    !(images[selectedImageIndex]?.settings.isFreeMark && 
      !images[selectedImageIndex]?.settings.hasDrawing);

  return (
    <div className="min-h-screen flex flex-col bg-[#282828] text-white">
      <Header onClearAll={handleCompleteReset} />

      <div className="flex-1 w-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 sm:mt-8">
          {/* Left Side - Upload + Generate Button */}
          <div className="flex flex-col gap-6">
            <UploadArea
              images={images}
              uploadError={uploadError}
              fileInputRef={fileInputRef}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              handleFiles={handleFiles}
              handleImageClick={onImageClick}
              handleRemove={handleEnhancedRemove}
              setSelectedImageIndex={setSelectedImageIndex}
              setModalImage={setModalImage}
              showResults={showResults}
              selectedResultImage={selectedResultImage}
              getStatusIcon={getStatusIcon}
              selectedImageIndex={selectedImageIndex}
              isGenerating={isGenerating}
              generatingIndex={generatingIndex}
            />

            {/* Generate Button with Face Detection Status */}
            <div className="space-y-2">
              {/* Face Detection Status for Selected Image */}
              {selectedImageIndex !== null && currentFaceDetection && (
                <div className={`text-xs px-3 py-1.5 rounded-lg text-center ${
                  currentFaceDetection.face_detection?.face_detected
                    ? "bg-green-900/50 border border-green-500 text-green-200"
                    : "bg-amber-900/50 border border-amber-500 text-amber-200"
                }`}>
                  {currentFaceDetection.face_detection?.face_detected 
                    ? `Face detected`
                    : "No face detected"
                  }
                </div>
              )}

              <button
                className={`w-full rounded-full font-bold text-base py-2.5 sm:py-3 flex items-center justify-center gap-2 text-black transition-all ${
                  canGenerate && !isMainGenerating
                    ? "bg-[#F9D50A] hover:bg-yellow-300"
                    : "bg-gray-600 cursor-not-allowed"
                }`}
                disabled={!canGenerate || isMainGenerating}
                onClick={async () => {
                  if (selectedImageIndex === null) return;
                  
                  try {
                    setIsMainGenerating(true);
                    setMainGenerationProgress("Preparing generation...");
                    
                    // Prepare minimal data for generation using saved patterns
                    const formData = new FormData();
                    
                    // Add the original image
                    const selectedImage = images[selectedImageIndex];
                    if (selectedImage?.src) {
                      setMainGenerationProgress("Loading image...");
                      const response = await fetch(selectedImage.src);
                      const blob = await response.blob();
                      formData.append("image", blob, "original_image.jpg");
                    }
                    
                    // Add current settings
                    const settings = getCurrentImageSettings();
                    formData.append("hair_color", settings.hairColor || "#000000");
                    formData.append("hair_type", settings.hairType || "Straight Hair");
                    formData.append("hair_line_type", settings.hairLineType || "Hairline");
                    formData.append("hair_density_3m", (settings.hairDensity3M || 0.7).toString());
                    formData.append("hair_density_8m", (settings.hairDensity8M || 0.9).toString());
                    formData.append("timeframe", settings.densityTimeframe || "3months");
                    formData.append("use_saved_pattern", "true");
                    formData.append("face_detected", (currentFaceDetection?.face_detection?.face_detected || false).toString());
                    
                    console.log("Generating with saved pattern from main button");
                    
                    // Update progress based on mode
                    if (settings.hairLineType === "Hairline") {
                      setMainGenerationProgress("Generating hair growth...");
                    } else {
                      setMainGenerationProgress("Generating hair growth...");
                    }
                    
                    // Send to generate endpoint with saved pattern
                    const response = await fetch("http://localhost:8000/generate-with-saved-pattern", {
                      method: "POST",
                      body: formData
                    });
                    
                    if (!response.ok) {
                      const errorText = await response.text();
                      throw new Error(`Generation failed: ${response.status} ${response.statusText} - ${errorText}`);
                    }
                    
                    setMainGenerationProgress("Processing results...");
                    const result = await response.json();
                    console.log("Generation successful:", result);
                    
                    // Handle results - for Hairline mode, we get both timeframes
                    if (result.has_both_timeframes && result.image_3months && result.image_8months) {
                      setMainGenerationProgress("Updating both timeframes...");
                      // Update image with both timeframes
                      updateImageWithGeneration(selectedImageIndex, "3 Months", result.image_3months);
                      updateImageWithGeneration(selectedImageIndex, "8 Months", result.image_8months);
                      
                      // Show results
                      setShowResults(true);
                      setSelectedResultImage({
                        ...images[selectedImageIndex],
                        generatedImage3Months: `data:image/png;base64,${result.image_3months}`,
                        generatedImage8Months: `data:image/png;base64,${result.image_8months}`
                      });
                      setSelectedTimeframe("3 Months");
                    } else {
                      setMainGenerationProgress("Updating results...");
                      // Single timeframe result
                      const timeframeForUpdate = settings.densityTimeframe === "3months" ? "3 Months" : "8 Months";
                      updateImageWithGeneration(selectedImageIndex, timeframeForUpdate, result.image);
                      
                      setShowResults(true);
                      setSelectedResultImage({
                        ...images[selectedImageIndex],
                        generatedImage3Months: settings.densityTimeframe === "3months" ? `data:image/png;base64,${result.image}` : images[selectedImageIndex].generatedImage3Months,
                        generatedImage8Months: settings.densityTimeframe === "8months" ? `data:image/png;base64,${result.image}` : images[selectedImageIndex].generatedImage8Months
                      });
                      setSelectedTimeframe(timeframeForUpdate);
                    }
                    
                  } catch (error) {
                    console.error("Generation error:", error);
                    alert(`Error generating hair: ${(error as Error).message}`);
                  } finally {
                    setIsMainGenerating(false);
                    setMainGenerationProgress("");
                  }
                }}
              >
                {isMainGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    {mainGenerationProgress || "Generating..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {selectedImageIndex === null
                      ? "Select an Image First"
                      : images[selectedImageIndex]?.status !== "valid"
                      ? "Invalid Image Selected"
                      : images[selectedImageIndex]?.settings.isFreeMark &&
                        !images[selectedImageIndex]?.settings.hasDrawing
                      ? "Draw & Save Settings First"
                      : "Generate Hair Growth"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Side - Instructions, Preview, or Results */}
          <div className="min-h-[250px] sm:min-h-[340px]">
            {showResults ? (
              <ComparisonResults
                selectedImage={selectedResultImage}
                selectedTimeframe={selectedTimeframe}
                setSelectedTimeframe={setSelectedTimeframe}
                onTryAgain={handleTryAgain}
                handleGenerateSingle={handleGenerateSingle}
                images={images}
                isGenerating={isGenerating}
                generatingIndex={generatingIndex}
              />
            ) : (
              <InstructionsPanel
                isGenerating={isGenerating}
                generationProgress={generationProgress}
                validImagesCount={validImages.length}
              />
            )}
          </div>
        </div>

        {/* Hidden canvas for color picking */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Initialize color picking canvas when image loads */}
        {modalImage && (
          <img
            src={modalImage}
            onLoad={() => {
              // Initialize the color picking canvas when image loads
              if (canvasRef.current && imageRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");
                const img = imageRef.current;
                
                if (ctx && img.complete) {
                  canvas.width = img.naturalWidth;
                  canvas.height = img.naturalHeight;
                  ctx.drawImage(img, 0, 0);
                  console.log("✅ Color picking canvas initialized");
                }
              }
            }}
            className="hidden"
            alt=""
          />
        )}

        {/* Color Picker Magnifying Glass */}
        {isColorPicking && mousePosition && (
          <ColorPickerMagnifier
            mousePosition={mousePosition}
            previewColor={previewColor}
          />
        )}

        {/* Modal for image preview and settings */}
        {modalImage &&
          selectedImageIndex !== null &&
          images[selectedImageIndex] && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4"
              onClick={() => setModalImage(null)}
            >
              <div
                className="bg-[#1A1A1A] rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col lg:flex-row shadow-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <ImagePreview
                  imageRef={imageRef}
                  drawCanvasRef={drawCanvasRef}
                  modalImage={modalImage}
                  isColorPicking={isColorPicking}
                  currentSettings={currentSettings}
                  tool={currentSettings.tool}
                  handleImageMouseMove={handleImageMouseMove}
                  handleImageClickForColor={handleImageClickForColor}
                  startDrawing={startDrawing}
                  draw={draw}
                  endDrawing={endDrawing}
                  setHistory={setHistory}
                  setRedoStack={setRedoStack}
                  hairLineType={currentSettings.hairLineType || "Hairline"}
                  showRegionIndicators={showResults}
                  isGeneratedResult={showResults}
                  showRegionPreview={!showResults}
                  faceDetectionData={currentFaceDetection}
                  selectedHairLineType={currentSettings.hairLineType || "Hairline"}
                />
                <SettingsPanel
                  currentSettings={currentSettings}
                  updateCurrentImageSettings={updateCurrentImageSettings}
                  isColorPicking={isColorPicking}
                  setIsColorPicking={setIsColorPicking}
                  setPreviewColor={setPreviewColor}
                  setMousePosition={setMousePosition}
                  setModalImage={setModalImage}
                  setSelectedImageIndex={setSelectedImageIndex}
                  predefinedColors={PREDEFINED_COLORS}
                  handlePredefinedColorClick={handlePredefinedColorClick}
                  handleWrongColor={handleWrongColor}
                  previewColor={previewColor}
                  hoveredColor={hoveredColor}
                  hairTypeOpen={hairTypeOpen}
                  setHairTypeOpen={setHairTypeOpen}
                  hairTypes={HAIR_TYPES}
                  history={history}
                  redoStack={redoStack}
                  undo={undo}
                  redo={redo}
                  clearCanvas={clearCanvas}
                  drawCanvasRef={drawCanvasRef}
                  faceDetected={currentFaceDetection?.face_detection?.face_detected || false}
                  faceDetectionConfidence={currentFaceDetection?.face_detection?.confidence || 0}
                  originalImage={selectedImageIndex !== null ? images[selectedImageIndex]?.src : undefined}
                  selectedImageIndex={selectedImageIndex}
                  onTimeframeChange={(timeframe: string) => {
                    // Handle timeframe changes if needed
                    console.log("Timeframe changed to:", timeframe);
                  }}
                  onGenerationComplete={(result: any) => {
                    // Handle generation completion
                    console.log("Generation completed:", result);
                    
                    // Update the image with generation result
                    if (result.imageIndex !== null && images[result.imageIndex]) {
                      const timeframeForUpdate = result.timeframe === "3months" ? "3 Months" : "8 Months";
                      
                      // Update the image with the generated result
                      updateImageWithGeneration(result.imageIndex, timeframeForUpdate, result.generatedImage);
                      
                      // Show results
                      setShowResults(true);
                      setSelectedResultImage({
                        ...images[result.imageIndex],
                        generatedImage3Months: result.timeframe === "3months" ? result.generatedImage : images[result.imageIndex].generatedImage3Months,
                        generatedImage8Months: result.timeframe === "8months" ? result.generatedImage : images[result.imageIndex].generatedImage8Months
                      });
                      setSelectedTimeframe(timeframeForUpdate);
                    }
                  }}
                />
              </div>
            </div>
          )}
      </div>
      <Footer />
    </div>
  );
}