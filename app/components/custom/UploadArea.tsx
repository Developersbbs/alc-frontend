import React from "react";
import { AlertCircle, ExternalLink, Trash2, Upload, ChevronLeft, ChevronRight } from "lucide-react";

interface UploadAreaProps {
  images: any[];
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFiles: (files: FileList | null) => void;
  handleImageClick: (img: any, idx: number) => void;
  handleRemove: (idx: number) => void;
  setSelectedImageIndex: (idx: number) => void;
  setModalImage: (src: string) => void;
  showResults: boolean;
  selectedResultImage: any;
  getStatusIcon: (status: string) => React.ReactNode;
  selectedImageIndex: number | null;
  isGenerating?: boolean;
  generatingIndex?: number | null;
}

const UploadArea: React.FC<UploadAreaProps> = ({
  images,
  uploadError,
  fileInputRef,
  handleDrop,
  handleDragOver,
  handleFiles,
  handleImageClick,
  handleRemove,
  setModalImage,
  showResults,
  selectedResultImage,
  getStatusIcon,
  selectedImageIndex,
  isGenerating = false,
  generatingIndex = null,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Reset carousel index when images change
  React.useEffect(() => {
    if (currentImageIndex >= images.length) {
      setCurrentImageIndex(0);
    }
  }, [images.length, currentImageIndex]);

  return (
    <div
      className="bg-[#333333] rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] shadow-md transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        accept="image/jpeg,image/png"
        multiple
        hidden
        ref={fileInputRef}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleFiles(e.target.files)
        }
        disabled={images.length >= 4}
      />
      
      {/* Upload Button - Show when no images */}
      {images.length === 0 && (
        <>
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-4 focus:outline-none transition-transform hover:scale-105"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex items-center justify-center rounded-full bg-[#484848]">
              <Upload className="text-[#F9D50A] w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
            </div>
          </button>
          
          <span className="text-base sm:text-xl lg:text-2xl font-semibold text-[#cccccc] text-center mt-4">
            {showResults ? "Your Generated Results" : "Drag & Drop Your Photo Here"}
          </span>
          
          <span className="text-sm sm:text-base text-[#cccccc] text-center mt-2">
            Or click here to Browse files
          </span>
          <span className="text-xs sm:text-sm text-[#808080] mt-2 text-center">
            Supports .JPG, .PNG (Max 4 images, 20MB each)
          </span>
        </>
      )}

      {/* Instructions when images exist */}
      {images.length > 0 && !showResults && (
        <div className="mb-4 text-sm sm:text-base text-yellow-400 text-center">
          Click on the image to select it, then click "Generate Hair Growth"
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mt-3 p-3 bg-red-900/50 border border-red-500 rounded-lg max-w-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-300" />
            <span className="text-xs sm:text-sm text-red-300">{uploadError}</span>
          </div>
        </div>
      )}

      {/* Image Carousel */}
      {images.length > 0 && (
        <div className="relative w-full max-w-lg mx-auto">
          {/* Main Image Display */}
          <div className="relative w-full">
            <div
              className={`relative group w-full h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden border-2 bg-black flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02] ${
                images[currentImageIndex]?.status === "valid"
                  ? "border-green-400"
                  : images[currentImageIndex]?.status === "invalid"
                  ? "border-red-400"
                  : "border-yellow-400"
              } ${
                selectedImageIndex === currentImageIndex && !showResults
                  ? "ring-4 ring-yellow-400 ring-offset-4 ring-offset-[#333333]"
                  : ""
              } ${
                showResults && selectedResultImage === images[currentImageIndex]
                  ? "ring-4 ring-blue-400 ring-offset-4 ring-offset-[#333333]"
                  : ""
              }`}
              title={
                showResults
                  ? (images[currentImageIndex]?.generatedImage3Months || images[currentImageIndex]?.generatedImage8Months)
                    ? `Image ${currentImageIndex + 1} - Click to view results`
                    : `Image ${currentImageIndex + 1} - Click to generate for this image`
                  : images[currentImageIndex]?.error ||
                    (images[currentImageIndex]?.status === "valid"
                      ? selectedImageIndex === currentImageIndex
                        ? "Selected - Click again to edit settings"
                        : "Click to select this image"
                      : "Validating...")
              }
              onClick={() => handleImageClick(images[currentImageIndex], currentImageIndex)}
            >
              <img 
                src={images[currentImageIndex]?.src} 
                alt={images[currentImageIndex]?.name} 
                className="object-cover w-full h-full rounded-xl" 
              />
              
              {/* Status indicator */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                {getStatusIcon(images[currentImageIndex]?.status)}
              </div>
              
              {/* Loading overlay for generating images */}
              {isGenerating && generatingIndex === currentImageIndex && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#F9D50A]"></div>
                    <span className="text-sm sm:text-base text-white">Generating...</span>
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex gap-2">
                {/* Settings button - only show for selected valid images and not in results view */}
                {images[currentImageIndex]?.status === "valid" && selectedImageIndex === currentImageIndex && !showResults && (
                  <button
                    type="button"
                    className="p-2 rounded-full bg-[#F9D50A] text-black hover:scale-110 transition-transform"
                    onClick={e => {
                      e.stopPropagation();
                      setModalImage(images[currentImageIndex].src);
                    }}
                    title="Edit settings"
                  >
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
                
                {/* Remove button */}
                {!showResults && (
                  <button
                    type="button"
                    className="p-2 rounded-full bg-red-500 text-white hover:scale-110 transition-transform"
                    onClick={e => {
                      e.stopPropagation();
                      handleRemove(currentImageIndex);
                    }}
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>
              
              {/* Invalid image overlay */}
              {images[currentImageIndex]?.status === "invalid" && (
                <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-300" />
                </div>
              )}
              
              {/* Visual indicators */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-2">
                {/* Selection indicator */}
                {selectedImageIndex === currentImageIndex && !showResults && images[currentImageIndex]?.status === "valid" && (
                  <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-white" title="Selected" />
                )}
                
                {/* Settings preview for unselected images */}
                {images[currentImageIndex]?.status === "valid" && !showResults && selectedImageIndex !== currentImageIndex && (
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: images[currentImageIndex]?.settings?.hairColor }}
                    title={`Hair: ${images[currentImageIndex]?.settings?.hairColor}, Type: ${images[currentImageIndex]?.settings?.hairType}`}
                  />
                )}
                
                {/* Generated indicator */}
                {(images[currentImageIndex]?.generatedImage3Months || images[currentImageIndex]?.generatedImage8Months) && (
                  <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white" title="Has generated results" />
                )}
              </div>
            </div>

            {/* Navigation Arrows - Only show if more than one image */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all hover:scale-110"
                  title="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all hover:scale-110"
                  title="Next image"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}
          </div>

          {/* Image Counter and Dots */}
          {images.length > 1 && (
            <div className="flex flex-col items-center mt-4 gap-3">
              {/* Image Counter */}
              <div className="text-sm sm:text-base text-[#cccccc]">
                {currentImageIndex + 1} of {images.length}
              </div>
              
              {/* Dot Indicators */}
              <div className="flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                      idx === currentImageIndex
                        ? "bg-[#F9D50A] scale-125"
                        : "bg-gray-500 hover:bg-gray-400"
                    }`}
                    title={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add More Images Button */}
          {images.length < 4 && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-[#484848] hover:bg-[#555555] text-[#F9D50A] rounded-lg transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-medium">Add More Images</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Swipe Instructions for Mobile */}
      {images.length > 1 && (
        <div className="mt-2 text-xs sm:text-sm text-[#808080] text-center md:hidden">
          Swipe left or right to navigate images
        </div>
      )}
    </div>
  );
};

export default UploadArea;