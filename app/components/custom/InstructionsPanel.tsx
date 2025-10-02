import React from "react";
import {  Loader, Plus } from "lucide-react";

interface InstructionsPanelProps {
  isGenerating: boolean;
  generationProgress: { current: number; total: number } | null;
  validImagesCount: number;
}

const InstructionsPanel: React.FC<InstructionsPanelProps> = ({
  isGenerating,
  generationProgress,
  validImagesCount,
}) => {
  return (
    <div className="bg-[#333333] rounded-2xl flex flex-col items-center justify-center p-6 sm:p-8 min-h-[250px] sm:min-h-[340px] shadow-lg h-full">
      <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-[#484848] mb-4">
        {isGenerating ? (
          <Loader className="text-[#F9D50A] w-5 h-5 sm:w-8 sm:h-8 animate-spin" />
        ) : (
          <Plus className="text-[#F9D50A] w-5 h-5 sm:w-8 sm:h-8" />
        )}
      </div>
      <span className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">
        {isGenerating ? "Generating Results..." : "Ready to Generate"}
      </span>
      <span className="text-xs sm:text-sm text-gray-300 mb-4 text-center px-4">
        {isGenerating
          ? generationProgress
            ? `Processing ${generationProgress.current} of ${generationProgress.total} images...`
            : "Please wait while we process your images"
          : validImagesCount > 0
          ? "Images uploaded! Click on any image to customize its settings, then generate results."
          : "Upload your photos, click on them to customize settings, then click \"Generate\" to see your Results"
        }
      </span>
    </div>
  );
};

export default InstructionsPanel;
