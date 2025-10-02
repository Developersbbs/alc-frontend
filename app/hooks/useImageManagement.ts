// hooks/useImageManagement.ts
import { useState, useRef, useCallback } from 'react';
import { UploadedImage, ImageSettings } from '../types';
import { getDefaultSettings } from '../constants/config';
import { UPLOAD_CONFIG } from '../constants/config';

export const useImageManagement = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentImageSettings = useCallback((): ImageSettings => {
    if (selectedImageIndex !== null && images[selectedImageIndex]) {
      return images[selectedImageIndex].settings;
    }
    return getDefaultSettings();
  }, [selectedImageIndex, images]);

  const updateCurrentImageSettings = useCallback((updates: Partial<ImageSettings>) => {
    if (selectedImageIndex !== null) {
      setImages((prev) =>
        prev.map((img, idx) =>
          idx === selectedImageIndex
            ? { ...img, settings: { ...img.settings, ...updates } }
            : img
        )
      );
    }
  }, [selectedImageIndex]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    setUploadError("");
    const filesToProcess = Array.from(files).slice(0, UPLOAD_CONFIG.MAX_IMAGES - images.length);
    if (filesToProcess.length === 0) return;

    const newImages: UploadedImage[] = filesToProcess.map((file) => ({
      src: URL.createObjectURL(file),
      file: file,
      name: file.name,
      status: "valid",
      error: undefined,
      settings: getDefaultSettings(),
    }));

    setImages((prev) => [...prev, ...newImages]);
  }, [images.length]);

  const handleRemove = useCallback((idx: number) => {
    setImages((prev) => {
      const newImages = prev.filter((_, i) => i !== idx);
      if (prev[idx]?.src) {
        URL.revokeObjectURL(prev[idx].src);
      }
      return newImages;
    });

    if (selectedImageIndex === idx) {
      setSelectedImageIndex(null);
      setModalImage(null);
    } else if (selectedImageIndex !== null && selectedImageIndex > idx) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  }, [selectedImageIndex]);

  const handleImageClick = useCallback((img: UploadedImage, idx: number, showResults: boolean) => {
    if (showResults) {
      if (img.generatedImage3Months || img.generatedImage8Months) {
        return { action: 'showResults', image: img };
      } else {
        setSelectedImageIndex(idx);
        return { action: 'switchToGeneration' };
      }
    } else {
      if (selectedImageIndex === idx) {
        setModalImage(img.src);
        return { action: 'openModal' };
      } else {
        setSelectedImageIndex(idx);
        return { action: 'selectImage' };
      }
    }
  }, [selectedImageIndex]);

  // Enhanced handleClearAll function to ensure complete reset
  const handleClearAll = useCallback((additionalResetFn?: () => void) => {
    // Clear all uploaded images and revoke their URLs to prevent memory leaks
    images.forEach((image) => {
      if (image.src && image.src.startsWith('blob:')) {
        URL.revokeObjectURL(image.src);
      }
      // Also revoke generated image URLs if they exist (for blob URLs)
      if (image.generatedImage3Months && image.generatedImage3Months.startsWith('blob:')) {
        URL.revokeObjectURL(image.generatedImage3Months);
      }
      if (image.generatedImage8Months && image.generatedImage8Months.startsWith('blob:')) {
        URL.revokeObjectURL(image.generatedImage8Months);
      }
    });

    // Reset all state to initial values - this should clear ALL images
    setImages([]); // This clears both uploaded and generated content
    setModalImage(null);
    setSelectedImageIndex(null);
    setUploadError("");

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Call additional reset function if provided and is actually a function
    if (additionalResetFn && typeof additionalResetFn === 'function') {
      additionalResetFn();
    }
  }, [images]);
  
  const updateImageWithGeneration = useCallback((
    imageIndex: number,
    timeframe: string,
    generatedImage: string
  ) => {
    setImages((prev) =>
      prev.map((img, idx) => {
        if (idx === imageIndex) {
          if (timeframe === "3 Months") {
            return {
              ...img,
              generatedImage3Months: `data:image/png;base64,${generatedImage}`,
            };
          } else {
            return {
              ...img,
              generatedImage8Months: `data:image/png;base64,${generatedImage}`,
            };
          }
        }
        return img;
      })
    );
  }, []);

  return {
    images,
    setImages,
    selectedImageIndex,
    setSelectedImageIndex,
    modalImage,
    setModalImage,
    uploadError,
    setUploadError,
    fileInputRef,
    getCurrentImageSettings,
    updateCurrentImageSettings,
    handleFiles,
    handleRemove,
    handleImageClick,
    handleClearAll,
    updateImageWithGeneration,
  };
};