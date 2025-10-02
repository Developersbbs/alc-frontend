import React from "react";

interface ColorPickerMagnifierProps {
  mousePosition: { x: number; y: number };
  previewColor: string | null;
}

const ColorPickerMagnifier: React.FC<ColorPickerMagnifierProps> = ({ mousePosition, previewColor }) => {
  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: mousePosition.x + 20,
        top: mousePosition.y - 20,
      }}
    >
      <div className="bg-white rounded-full p-2 shadow-lg border-4 border-black">
        <div
          className="w-8 h-8 rounded-full border-2 border-gray-300"
          style={{ backgroundColor: previewColor || "#000" }}
        />
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded">
          {previewColor}
        </div>
      </div>
    </div>
  );
};

export default ColorPickerMagnifier;
