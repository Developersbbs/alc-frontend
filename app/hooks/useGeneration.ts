// hooks/useGeneration.ts
import { useState, useCallback } from 'react';
import { UploadedImage, GenerationProgress } from '../types';
import { ApiService } from '../services/apiService';

export const useGeneration = (
  images: UploadedImage[],
  updateImageWithGeneration: (imageIndex: number, timeframe: string, generatedImage: string) => void,
  setUploadError: (error: string) => void
) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [selectedResultImage, setSelectedResultImage] = useState<UploadedImage | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("3 Months");

  const handleGenerateSingle = useCallback(async (
    imageIndex: number,
    timeframe: string = "3 Months"
  ) => {
    setIsGenerating(true);
    setGeneratingIndex(imageIndex);
    try {
      console.log(
        `Starting generation for image ${imageIndex} with timeframe ${timeframe}...`
      );

      const result = await ApiService.generateSingleImage(imageIndex, images, timeframe);

      console.log("Hair generation completed for individual image");

      updateImageWithGeneration(imageIndex, timeframe, result.image);

      const updatedImage = images[imageIndex];
      setSelectedResultImage({
        ...updatedImage,
        [timeframe === "3 Months"
          ? "generatedImage3Months"
          : "generatedImage8Months"]: `data:image/png;base64,${result.image}`,
      });
      setSelectedTimeframe(timeframe);
      setShowResults(true);

      console.log(`Generation completed for image ${imageIndex}`);
    } catch (error: any) {
      console.error("Error generating hair:", error);
      
      // Better error handling - preserve the original error
      let errorMessage = "Failed to generate hair growth simulation. Please try again.";
      
      if (error) {
        if (typeof error === "string" && error.trim()) {
          errorMessage = error;
        } else if (error.message && error.message.trim()) {
          errorMessage = error.message;
        } else if (error.detail && error.detail.trim()) {
          errorMessage = error.detail;
        }
      }
      
      console.error("Final error message:", errorMessage);
      setUploadError(errorMessage);
    } finally {
      setIsGenerating(false);
      setGeneratingIndex(null);
    }
  }, [images, updateImageWithGeneration, setUploadError]);

  const handleGenerate = useCallback(async (selectedImageIndex: number | null) => {
    if (selectedImageIndex === null) {
      setUploadError("Please select an image first by clicking on it.");
      return;
    }

    const selectedImg = images[selectedImageIndex];
    if (!selectedImg || selectedImg.status !== "valid") {
      setUploadError("Please select a valid image.");
      return;
    }

    // Check if FreeMark mode and no drawing data
    if (selectedImg.settings.isFreeMark && !selectedImg.settings.hasDrawing) {
      setUploadError(
        "Please draw on the image and save settings first for FreeMark mode."
      );
      return;
    }

    setIsGenerating(true);
    setGeneratingIndex(selectedImageIndex);
    setUploadError("");

    try {
      console.log(
        `Starting generation for selected image ${selectedImageIndex}...`
      );

      const [results3Months, results8Months] = await Promise.all([
        ApiService.generateSingleImage(selectedImageIndex, images, "3 Months"),
        ApiService.generateSingleImage(selectedImageIndex, images, "8 Months"),
      ]);

      console.log("Hair generation completed for both timeframes");

      updateImageWithGeneration(selectedImageIndex, "3 Months", results3Months.image);
      updateImageWithGeneration(selectedImageIndex, "8 Months", results8Months.image);

      const updatedImage = {
        ...selectedImg,
        generatedImage3Months: `data:image/png;base64,${results3Months.image}`,
        generatedImage8Months: `data:image/png;base64,${results8Months.image}`,
      };

      setSelectedResultImage(updatedImage);
      setSelectedTimeframe("3 Months");
      setShowResults(true);

      console.log(`Generation completed for image ${selectedImageIndex}`);
    } catch (error: any) {
      console.error("Error generating hair:", error);
      
      // Better error handling - preserve the original error
      let errorMessage = "Failed to generate hair growth simulation. Please try again.";
      
      if (error) {
        if (typeof error === "string" && error.trim()) {
          errorMessage = error;
        } else if (error.message && error.message.trim()) {
          errorMessage = error.message;
        } else if (error.detail && error.detail.trim()) {
          errorMessage = error.detail;
        }
      }
      
      console.error("Final error message:", errorMessage);
      setUploadError(errorMessage);
    } finally {
      setIsGenerating(false);
      setGeneratingIndex(null);
    }
  }, [images, updateImageWithGeneration, setUploadError]);

  const handleTryAgain = useCallback(() => {
    setShowResults(false);
    setSelectedResultImage(null);
    setSelectedTimeframe("3 Months");
  }, []);

  return {
    isGenerating,
    generatingIndex,
    generationProgress,
    showResults,
    selectedResultImage,
    selectedTimeframe,
    setShowResults,
    setSelectedResultImage,
    setSelectedTimeframe,
    handleGenerateSingle,
    handleGenerate,
    handleTryAgain,
  };
};