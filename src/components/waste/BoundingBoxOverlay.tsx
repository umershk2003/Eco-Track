import React from 'react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Detection {
  class_name: string;
  confidence: number;
  boundingBox: BoundingBox;
}

interface BoundingBoxOverlayProps {
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
}

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  detections,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight
}) => {
  // Calculate scaling factors
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((det, index) => {
        const { x, y, width, height } = det.boundingBox;
        
        // Scale coordinates to fit container
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledW = width * scaleX;
        const scaledH = height * scaleY;

        return (
          <div
            key={index}
            className="absolute border-2 border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-500 ease-out"
            style={{
              left: `${scaledX}px`,
              top: `${scaledY}px`,
              width: `${scaledW}px`,
              height: `${scaledH}px`,
            }}
          >
            <div className="absolute -top-7 left-[-2px] bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-t-md rounded-br-md shadow-md whitespace-nowrap">
              {det.class_name.toUpperCase()} {(det.confidence * 100).toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};
