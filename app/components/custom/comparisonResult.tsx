import { Download, Maximize2, Share2, X } from 'lucide-react';
import React, { useState } from 'react'

type UploadedImage = {
  src: string;
  file: File;
  name: string;
  status: "valid" | "invalid" | "validating";
  error?: string;
  generatedImage3Months?: string;
  generatedImage8Months?: string;
  settings: any;
};

type ComparisonResultsProps = {
  selectedImage: UploadedImage | null;
  selectedTimeframe: string;
  setSelectedTimeframe: React.Dispatch<React.SetStateAction<string>>;
  onTryAgain: () => void;
  handleGenerateSingle?: (index: number, timeframe: string) => void;
  images?: UploadedImage[];
  isGenerating?: boolean;
  generatingIndex?: number | null;
};

const ComparisonResults = ({
  selectedImage,
  selectedTimeframe,
  setSelectedTimeframe,
  onTryAgain,
}: ComparisonResultsProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const beforeImage = selectedImage?.src || "";
  const after3 = selectedImage?.generatedImage3Months || "";
  const after8 = selectedImage?.generatedImage8Months || "";
  
  const afterImage = selectedTimeframe === '3 Months' 
    ? selectedImage?.generatedImage3Months || ""
    : selectedImage?.generatedImage8Months || "";

  // Create collage canvas with all three images
  const createCollageCanvas = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas dimensions for three images side by side
    const imageSize = 400;
    const padding = 20;
    const labelHeight = 50;
    canvas.width = (imageSize * 3) + (padding * 4);
    canvas.height = imageSize + (padding * 2) + labelHeight;

    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Helper function to load and draw image
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    // Draw images
    try {
      const images = [];
      const labels = ['Before', 'After 3 Months', 'After 8 Months'];
      const sources = [beforeImage, after3, after8];

      for (let i = 0; i < 3; i++) {
        if (sources[i]) {
          try {
            const img = await loadImage(sources[i]);
            images.push({ img, label: labels[i], index: i });
          } catch (error) {
            console.warn(`Failed to load image ${i}:`, error);
            // Create placeholder for failed image
            images.push({ img: null, label: labels[i], index: i });
          }
        } else {
          // Create placeholder for missing image
          images.push({ img: null, label: labels[i], index: i });
        }
      }

      // Draw each image
      images.forEach(({ img, label, index }) => {
        const x = padding + (index * (imageSize + padding));
        const y = padding + labelHeight;

        // Draw image or placeholder
        if (img) {
          // Calculate scaling to fit within imageSize while maintaining aspect ratio
          const scale = Math.min(imageSize / img.width, imageSize / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const offsetX = (imageSize - scaledWidth) / 2;
          const offsetY = (imageSize - scaledHeight) / 2;
          
          ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);
        } else {
          // Draw placeholder
          ctx.fillStyle = '#333333';
          ctx.fillRect(x, y, imageSize, imageSize);
          
          // Draw "No Image" text
          ctx.fillStyle = '#666666';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('No Image', x + imageSize / 2, y + imageSize / 2);
        }

        // Draw border
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, imageSize, imageSize);

        // Draw label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + imageSize / 2, padding + 35);
      });

      // Add title
      ctx.fillStyle = '#FFFF00';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Hair Growth Progress - ${selectedImage?.name || "Image"}`,
        canvas.width / 2,
        canvas.height - 10
      );

      return canvas;
    } catch (error) {
      console.error('Error creating collage:', error);
      return null;
    }
  };

  // Download function for collage
  const handleDownload = async () => {
    if (!beforeImage && !after3 && !after8) {
      alert("No images available for download");
      return;
    }

    try {
      const canvas = await createCollageCanvas();
      if (!canvas) {
        alert("Failed to create collage");
        return;
      }

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `hair-growth-collage-${selectedImage?.name || "image"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      alert("Failed to download collage");
    }
  };

  // Share function - opens WhatsApp with image
  const handleShare = async () => {
  if (!beforeImage && !after3 && !after8) {
    alert("No images available to share");
    return;
  }

  try {
    const canvas = await createCollageCanvas();
    if (!canvas) {
      alert("Failed to create collage");
      return;
    }

    // Convert canvas to blob instead of DataURL
    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert("Failed to create image blob");
        return;
      }

      const file = new File([blob], `hair-growth-collage-${selectedImage?.name || "image"}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Hair Growth Collage",
            text: "Check out my hair growth results!",
          });
        } catch (err) {
          console.error("Share cancelled or failed:", err);
        }
      } else {
        alert("Sharing not supported on this browser");
      }
    }, "image/png");
  } catch (error) {
    console.error("Share error:", error);
    alert("Failed to share collage");
  }
};

  // Maximize function for full view
  const handleMaximize = () => {
    setIsMaximized(true);
  };

  const handleCloseMaximized = () => {
    setIsMaximized(false);
  };

  return (
    <>
      <div className="bg-[#333333] rounded-xl lg:rounded-2xl flex flex-col shadow-lg h-full min-h-[500px] max-w-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-gray-600 gap-3 sm:gap-0">
          <h2 className="text-white text-sm sm:text-base lg:text-lg font-medium truncate max-w-full sm:max-w-[60%]">
            Hair Growth Results - {selectedImage?.name || "Image"}
          </h2>
          
          <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
            {['3 Months', '8 Months'].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`flex-1 sm:flex-none px-2.5 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  selectedTimeframe === timeframe
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-600 text-white hover:bg-gray-500 active:bg-gray-400'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 h-full">
            {/* Before Image */}
            <div className="relative h-full min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
              <div className="bg-gray-700 rounded-lg overflow-hidden w-full h-full flex items-center justify-center">
                {beforeImage ? (
                  <img
                    src={beforeImage}
                    alt="Before treatment"
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm sm:text-base">
                    No image
                  </div>
                )}
              </div>
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs sm:text-sm font-medium">
                Before
              </div>
            </div>

            {/* After Image */}
            <div className="relative h-full min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
              <div className="bg-gray-700 rounded-lg overflow-hidden w-full h-full flex items-center justify-center">
                {afterImage ? (
                  <img
                    src={afterImage}
                    alt={`After ${selectedTimeframe}`}
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm sm:text-base">
                    No image
                  </div>
                )}
              </div>
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs sm:text-sm font-medium">
                After {selectedTimeframe}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 sm:p-4 bg-[#333333] border-t border-gray-600 gap-3 sm:gap-2">
          <div className="flex gap-2 sm:gap-3 justify-center sm:justify-start order-2 sm:order-1">
            <button 
              onClick={handleDownload}
              className="p-2 sm:p-2.5 text-yellow-400 hover:text-yellow-300 active:text-yellow-200 transition-colors rounded-lg hover:bg-gray-600/50 active:bg-gray-600"
              title="Download collage (Before + 3 Months + 8 Months)"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={handleShare}
              className="p-2 sm:p-2.5 text-yellow-400 hover:text-yellow-300 active:text-yellow-200 transition-colors rounded-lg hover:bg-gray-600/50 active:bg-gray-600"
              title="Share via WhatsApp"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={handleMaximize}
              className="p-2 sm:p-2.5 text-yellow-400 hover:text-yellow-300 active:text-yellow-200 transition-colors rounded-lg hover:bg-gray-600/50 active:bg-gray-600"
              title="Full screen view"
            >
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="w-full sm:w-auto order-1 sm:order-2">
            <button 
              onClick={onTryAgain}
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-500 active:bg-gray-400 text-white font-medium px-4 py-2.5 sm:py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>

      {/* Maximized View Modal */}
      {isMaximized && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <h3 className="text-white text-lg sm:text-xl font-medium truncate max-w-full">
                  Hair Growth Results - {selectedImage?.name || "Image"}
                </h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  {['3 Months', '8 Months'].map((timeframe) => (
                    <button
                      key={timeframe}
                      onClick={() => setSelectedTimeframe(timeframe)}
                      className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        selectedTimeframe === timeframe
                          ? 'bg-yellow-400 text-black'
                          : 'bg-gray-600 text-white hover:bg-gray-500 active:bg-gray-400'
                      }`}
                    >
                      {timeframe}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
                <button 
                  onClick={handleDownload}
                  className="flex-1 sm:flex-none p-2 sm:p-2.5 text-yellow-400 hover:text-yellow-300 active:text-yellow-200 transition-colors bg-gray-800 rounded-lg hover:bg-gray-700 active:bg-gray-600"
                  title="Download collage (Before + 3 Months + 8 Months)"
                >
                  <Download className="w-5 h-5 mx-auto" />
                </button>
                <button 
                  onClick={handleShare}
                  className="flex-1 sm:flex-none p-2 sm:p-2.5 text-yellow-400 hover:text-yellow-300 active:text-yellow-200 transition-colors bg-gray-800 rounded-lg hover:bg-gray-700 active:bg-gray-600"
                  title="Share collage via WhatsApp"
                >
                  <Share2 className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={handleCloseMaximized}
                  className="flex-1 sm:flex-none p-2 sm:p-2.5 text-white hover:text-gray-300 active:text-gray-400 transition-colors bg-gray-800 rounded-lg hover:bg-gray-700 active:bg-gray-600"
                  title="Close full screen"
                >
                  <X className="w-5 h-5 mx-auto" />
                </button>
              </div>
            </div>
            
            {/* Modal Images */}
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 min-h-0">
              <div className="relative min-h-[250px] sm:min-h-[300px] lg:min-h-[400px]">
                <div className="bg-[#333333] rounded-lg overflow-hidden h-full flex items-center justify-center">
                  {beforeImage ? (
                    <img
                      src={beforeImage}
                      alt="Before treatment"
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-base sm:text-lg">
                      No image
                    </div>
                  )}
                </div>
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/70 text-white px-3 py-2 rounded text-base sm:text-lg font-medium">
                  Before
                </div>
              </div>

              <div className="relative min-h-[250px] sm:min-h-[300px] lg:min-h-[400px]">
                <div className="bg-[#333333] rounded-lg overflow-hidden h-full flex items-center justify-center">
                  {afterImage ? (
                    <img
                      src={afterImage}
                      alt={`After ${selectedTimeframe}`}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-base sm:text-lg">
                      No image
                    </div>
                  )}
                </div>
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/70 text-white px-3 py-2 rounded text-base sm:text-lg font-medium">
                  After {selectedTimeframe}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ComparisonResults