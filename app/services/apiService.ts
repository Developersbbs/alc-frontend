// services/apiService.ts - Improved Version
import { UploadedImage } from "../types";
import { API_CONFIG } from "../constants/config";

// Types for better type safety
interface GenerationRequest {
  imageIndex: number;
  images: UploadedImage[];
  timeframe: string;
}

interface GenerationResponse {
  success: true;
  data: any;
  image: string;
  request_id: string;
  generation_method: string;
  timeframe: string;
  settings: {
    hair_type: string;
    hair_color: string;
    hair_density_3m: number;
    hair_density_8m: number;
    current_hair_density: number;
  };
}

interface GenerationError {
  success: false;
  error: string;
  code?: string;
}

export class ApiService {
  // Timeout constants
  private static readonly HEALTH_CHECK_TIMEOUT = 10000;
  private static readonly GENERATION_TIMEOUT = 60000;
  
  // Cache health check result for 30 seconds
  private static healthCheckCache: { timestamp: number; isHealthy: boolean } | null = null;
  private static readonly HEALTH_CACHE_DURATION = 30000;

  /**
   * Check if backend is healthy with caching
   */
  private static async checkBackendHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Use cached result if available and recent
    if (this.healthCheckCache && (now - this.healthCheckCache.timestamp) < this.HEALTH_CACHE_DURATION) {
      return this.healthCheckCache.isHealthy;
    }

    try {
      console.log("Performing backend health check...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT);

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HEALTH}`,
        { 
          method: "GET",
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      
      const isHealthy = response.ok;
      this.healthCheckCache = { timestamp: now, isHealthy };
      
      console.log(`Health check result: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      return isHealthy;
      
    } catch (error: any) {
      console.error("Health check failed:", error);
      this.healthCheckCache = { timestamp: now, isHealthy: false };
      return false;
    }
  }

  /**
   * Validate generation request
   */
  private static validateGenerationRequest({ imageIndex, images, timeframe }: GenerationRequest): void {
    if (imageIndex < 0 || imageIndex >= images.length) {
      throw new Error(`Invalid image index: ${imageIndex}`);
    }

    const img = images[imageIndex];
    if (!img || img.status !== "valid") {
      throw new Error("Invalid image selected");
    }

    if (!['3 Months', '3months', '8 Months', '8months'].includes(timeframe)) {
      throw new Error(`Invalid timeframe: ${timeframe}`);
    }

    // Validate FreeMark requirements
    if (img.settings.isFreeMark) {
      const mask3MonthsData = img.settings.canvasDrawing_3months;
      const mask8MonthsData = img.settings.canvasDrawing_8months;
      
      if (!mask3MonthsData && !mask8MonthsData) {
        throw new Error('FreeMark mode requires at least one mask. Please draw masks for the desired timeframes.');
      }

      // Check if the requested timeframe has a corresponding mask
      const requiredMask = timeframe === '3months' || timeframe === '3 months' || timeframe === '3 Months' 
        ? mask3MonthsData 
        : mask8MonthsData;
        
      if (!requiredMask) {
        throw new Error(`No mask found for ${timeframe}. Please create a mask for this timeframe first.`);
      }
    }
  }

  /**
   * Preview the combined image with mask overlay for debugging
   */
  private static async previewCombinedImage(
    originalImageFile: File,
    maskDataURL: string,
    timeframe: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔍 PREVIEW: Creating combined image preview for ${timeframe}`);

        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Create image element for original image
        const img = new Image();
        img.onload = () => {
          // Set canvas size to match image
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Create mask image from data URL
          const maskImg = new Image();
          maskImg.onload = () => {
            try {
              // Create temporary canvas for mask processing
              const maskCanvas = document.createElement('canvas');
              const maskCtx = maskCanvas.getContext('2d');

              if (!maskCtx) {
                throw new Error('Failed to get mask canvas context');
              }

              maskCanvas.width = maskImg.naturalWidth;
              maskCanvas.height = maskImg.naturalHeight;

              // Draw mask image
              maskCtx.drawImage(maskImg, 0, 0);

              // Get mask image data
              const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
              const data = maskImageData.data;

              // Process mask - find non-transparent areas and color them #BCF473
              let maskPixelCount = 0;
              for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];

                // If pixel is not fully transparent, color it with #BCF473
                if (alpha > 0) {
                  // #BCF473 in RGB
                  data[i] = 188;     // R
                  data[i + 1] = 244; // G
                  data[i + 2] = 115; // B
                  data[i + 3] = 255; // A (fully opaque)
                  maskPixelCount++;
                }
              }

              // Put processed mask data back
              maskCtx.putImageData(maskImageData, 0, 0);

              // Draw processed mask on top of original image
              ctx.drawImage(maskCanvas, 0, 0);

              // Log information about the combined image
              console.log(`📊 COMBINED IMAGE INFO:`, {
                originalSize: `${img.naturalWidth}x${img.naturalHeight}`,
                maskPixelCount: maskPixelCount,
                maskPercentage: ((maskPixelCount / (img.naturalWidth * img.naturalHeight)) * 100).toFixed(1) + '%',
                timeframe: timeframe,
                maskColor: '#BCF473'
              });

              // Convert canvas to data URL for preview
              const dataURL = canvas.toDataURL('image/png');

              // Log the data URL (first 100 characters for brevity)
              console.log(`🖼️ COMBINED IMAGE DATA URL (preview):`, dataURL.substring(0, 100) + '...');

              resolve(dataURL);

            } catch (error) {
              console.error('❌ Error creating combined image preview:', error);
              reject(error);
            }
          };

          maskImg.onerror = () => {
            reject(new Error('Failed to load mask image'));
          };

          maskImg.src = maskDataURL;

        };

        img.onerror = () => {
          reject(new Error('Failed to load original image'));
        };

        // Create object URL for file
        const objectUrl = URL.createObjectURL(originalImageFile);
        img.src = objectUrl;

        // Clean up object URL after use
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
        };

      } catch (error) {
        console.error('❌ Error in preview function:', error);
        reject(error);
      }
    });
  }

  /**
   * Prepare form data for API request - Updated for separate timeframe routes
   */
  private static async prepareFormData(img: UploadedImage, timeframe: string): Promise<FormData> {
    const formData = new FormData();

    try {
      if (img.settings.isFreeMark) {
        console.log("Processing FreeMark with current canvas content...");

        // For FreeMark, create a combined image (original + current canvas mask)
        const originalImageFile = img.file;

        // Get current canvas for mask
        if ((window as any).drawCanvasRef?.current) {
          const canvas = (window as any).drawCanvasRef.current;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            // Check if canvas has content
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hasContent = !imageData.data.every(x => x === 0);

            if (hasContent) {
              // Create combined image with mask overlay
              const combinedDataURL = await this.createCombinedImageDataURL(originalImageFile, canvas);

              // Convert to blob and add as the main image
              const combinedBlob = this.dataURLToBlob(combinedDataURL);
              formData.append("image", new File([combinedBlob], `combined_${img.file.name}`, { type: combinedBlob.type }));

              console.log("✅ FreeMark combined image prepared");
            } else {
              // No canvas content, use original image
              formData.append("image", originalImageFile);
              console.log("⚠️ FreeMark canvas empty, using original image");
            }
          } else {
            formData.append("image", originalImageFile);
            console.log("⚠️ No canvas context, using original image");
          }
        } else {
          formData.append("image", originalImageFile);
          console.log("⚠️ No canvas reference, using original image");
        }

        console.log("FreeMark files prepared successfully");
      } else {
        // For Hairline mode, use the existing logic (pattern canvas as mask)
        formData.append("image", img.file);
        formData.append("has_mask", "false");
        formData.append("use_auto_mask", "true");
        console.log("Processing regular image (auto-mask mode)");
      }

      // Add common parameters
      const normalizedTimeframe = timeframe === "3 Months" ? "3months" : "8months";
      formData.append("hair_color", img.settings.hairColor || '#000000');
      formData.append("hair_type", img.settings.hairType || 'Straight Hair');

      // Add timeframe-specific densities
      formData.append('hair_density_3m', (img.settings.hairDensity3M || 0.5).toString());
      formData.append('hair_density_8m', (img.settings.hairDensity8M || 0.8).toString());

      formData.append(
        "hair_line_type",
        img.settings.isFreeMark ? "FreeMark" : (img.settings.hairLineType || "Hairline")
      );

      console.log('Generation parameters:', {
        timeframe: normalizedTimeframe,
        hairColor: img.settings.hairColor,
        hairType: img.settings.hairType,
        densities: {
          '3m': img.settings.hairDensity3M || 0.5,
          '8m': img.settings.hairDensity8M || 0.8
        },
        isFreeMark: img.settings.isFreeMark
      });

      return formData;
    } catch (error: any) {
      console.error(`Failed to prepare form data for ${img.name}:`, error);
      throw new Error(`Failed to prepare request data: ${error?.message || error}`);
    }
  }

  /**
   * Send generation request to backend - Updated for separate timeframe routes
   */
  private static async sendGenerationRequest(formData: FormData): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.GENERATION_TIMEOUT);

    try {
      // Determine which endpoint to use based on timeframe
      const timeframe = formData.get("timeframe") as string;
      const endpoint = timeframe === "3months"
        ? API_CONFIG.ENDPOINTS.GENERATE_3MONTHS
        : API_CONFIG.ENDPOINTS.GENERATE_8MONTHS;

      console.log(`Sending ${timeframe} generation request to ${endpoint}...`);
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${endpoint}`,
        {
          method: "POST",
          body: formData,
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleAPIError(response);
      }

      const data = await response.json();
      console.log(`${timeframe} generation request successful`);
      return data;

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Generation request timed out. Please try again.');
      }

      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to the generation service. Please check your internet connection.');
      }

      throw error;
    }
  }

  /**
   * Handle API error responses
   */
  private static async handleAPIError(response: Response): Promise<never> {
    console.error("API error response:", response.status, response.statusText);
    
    let errorText = "";
    let errorData: any = {};
    
    try {
      errorText = await response.text();
      if (errorText) {
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use the text as is
        }
      }
    } catch (textError) {
      console.error("Failed to read error response:", textError);
    }

    // Extract meaningful error message
    let errorMessage = "Hair generation failed";
    
    if (errorData.detail && typeof errorData.detail === "string") {
      errorMessage = errorData.detail;
    } else if (errorData.message && typeof errorData.message === "string") {
      errorMessage = errorData.message;
    } else if (errorText && typeof errorText === "string" && errorText.trim()) {
      errorMessage = errorText;
    } else {
      // Provide specific error messages based on status code
      switch (response.status) {
        case 400:
          errorMessage = "Invalid request parameters. Please check your settings.";
          break;
        case 413:
          errorMessage = "Image file too large. Please use a smaller image.";
          break;
        case 429:
          errorMessage = "Too many requests. Please wait a moment and try again.";
          break;
        case 500:
          errorMessage = "Server error occurred. Please try again later.";
          break;
        case 503:
          errorMessage = "Service temporarily unavailable. Please try again later.";
          break;
        default:
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
      }
    }

    throw new Error(errorMessage);
  }

  /**
   * Process API response and normalize format
   */
  private static async processAPIResponse(data: any): Promise<GenerationResponse> {
    if (data.image) {
      console.log("Response contains image data");
      return {
        success: true,
        data: data,
        image: data.image,
        request_id: data.request_id,
        generation_method: data.generation_method,
        timeframe: data.timeframe,
        settings: {
          hair_type: data.hair_type,
          hair_color: data.hair_color,
          hair_density_3m: data.hair_density_3m,
          hair_density_8m: data.hair_density_8m,
          current_hair_density: data.current_hair_density
        }
      };
    }

    if (data.filename) {
      console.log("Response contains filename, fetching image...");
      try {
        const imgResponse = await fetch(`${API_CONFIG.BASE_URL}/images/${data.filename}`);
        
        if (!imgResponse.ok) {
          throw new Error(`Failed to fetch generated image (${imgResponse.status})`);
        }
        
        const blob = await imgResponse.blob();
        const base64 = await this.blobToBase64(blob);
        
        console.log("Successfully converted image to base64");
        return {
          success: true,
          data: data,
          image: base64,
          request_id: data.request_id,
          generation_method: data.generation_method,
          timeframe: data.timeframe,
          settings: {
            hair_type: data.hair_type,
            hair_color: data.hair_color,
            hair_density_3m: data.hair_density_3m,
            hair_density_8m: data.hair_density_8m,
            current_hair_density: data.current_hair_density
          }
        };
      } catch (imgError: any) {
        console.error("Failed to fetch image file:", imgError);
        throw new Error(`Failed to fetch generated image: ${imgError.message}`);
      }
    }

    console.error("Response does not contain image or filename:", data);
    throw new Error("Invalid response: No image data received from server");
  }

  /**
   * Main generation method with improved error handling
   */
  static async generateSingleImage(
    imageIndex: number,
    images: UploadedImage[],
    timeframe: string
  ): Promise<GenerationResponse> {
    try {
      // Validate request
      this.validateGenerationRequest({ imageIndex, images, timeframe });
      
      const img = images[imageIndex];
      console.log(`Starting generation for image ${imageIndex} (${img.name}) - ${timeframe}`);

      // Check backend health
      const isHealthy = await this.checkBackendHealth();
      if (!isHealthy) {
        throw new Error('Backend service is currently unavailable. Please try again later.');
      }

      // Prepare form data
      const formData = await this.prepareFormData(img, timeframe);

      // Send request
      const data = await this.sendGenerationRequest(formData);

      // Process and return response
      const result = await this.processAPIResponse(data);
      console.log(`Generation completed successfully for image ${imageIndex}`);
      
      return result;
      
    } catch (error: any) {
      console.error(`Generation failed for image ${imageIndex}:`, error);
      
      // Re-throw the error as-is to preserve the message
      if (error instanceof Error) {
        throw error;
      }
      
      // Handle non-Error objects
      const message = typeof error === "string" && error.trim() 
        ? error 
        : error?.message || error?.detail || "Failed to generate hair growth simulation";
        
      throw new Error(message);
    }
  }

  /**
   * Batch generation with better error handling and progress tracking
   */
  static async generateBatchImages(
    imageIndices: number[],
    images: UploadedImage[],
    timeframes: string[],
    onProgress?: (completed: number, total: number, currentImage?: string) => void
  ): Promise<{ results: (GenerationResponse | GenerationError)[], errors: number }> {
    const total = imageIndices.length * timeframes.length;
    let completed = 0;
    let errors = 0;
    const results: (GenerationResponse | GenerationError)[] = [];

    for (const imageIndex of imageIndices) {
      for (const timeframe of timeframes) {
        try {
          const imageName = images[imageIndex]?.name || `Image ${imageIndex}`;
          onProgress?.(completed, total, `${imageName} - ${timeframe}`);
          
          const result = await this.generateSingleImage(imageIndex, images, timeframe);
          results.push(result);
          
        } catch (error: any) {
          console.error(`Batch generation failed for image ${imageIndex}, timeframe ${timeframe}:`, error);
          errors++;
          
          const errorMessage = error instanceof Error 
            ? error.message 
            : typeof error === "string" 
              ? error 
              : "Generation failed";
              
          results.push({
            success: false,
            error: errorMessage,
            code: `IMG_${imageIndex}_${timeframe}`
          });
        } finally {
          completed++;
          onProgress?.(completed, total);
        }
      }
    }

    return { results, errors };
  }

  /**
   * Create combined image data URL from original image and canvas mask
   */
  private static async createCombinedImageDataURL(originalImageFile: File, maskCanvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        console.log("🔍 Creating combined image from file and canvas");

        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Create image element for original image
        const img = new Image();
        img.onload = () => {
          // Set canvas size to match image
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Draw mask canvas on top with green overlay
          const maskCtx = maskCanvas.getContext('2d');
          if (maskCtx) {
            // Get mask image data and convert to green overlay
            const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            const data = maskImageData.data;

            for (let i = 0; i < data.length; i += 4) {
              const alpha = data[i + 3];

              // If pixel has ANY opacity (is part of the mask)
              if (alpha > 0) {
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

            maskCtx.putImageData(maskImageData, 0, 0);
          }

          // Draw the processed mask on top of the original image
          ctx.drawImage(maskCanvas, 0, 0);

          // Convert canvas to data URL
          const dataURL = canvas.toDataURL('image/png');
          console.log("✅ Combined image created successfully");
          resolve(dataURL);

        };

        img.onerror = () => {
          reject(new Error('Failed to load original image'));
        };

        // Create object URL for file
        const objectUrl = URL.createObjectURL(originalImageFile);
        img.src = objectUrl;

        // Clean up object URL after use
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
        };

      } catch (error) {
        console.error('❌ Error creating combined image:', error);
        reject(error);
      }
    });
  }

  /**
   * Convert data URL to Blob
   */
  private static dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type: mime});
  }

  // Helper methods
  private static dataURLtoFile(dataURL: string, filename: string): File {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type: mime});
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(new Error("Failed to convert image to base64"));
      };
      reader.readAsDataURL(blob);
    });
  }
}