import React, { useState } from 'react';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';

interface Detection {
  class_name: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface ImagePreviewProps {
  imageFile: File;
  onRetake: () => void;
  onSubmit: () => void;
  isProcessing: boolean;
  detections?: Detection[];
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ 
  imageFile, 
  onRetake, 
  onSubmit, 
  isProcessing,
  detections 
}) => {
  const imageUrl = URL.createObjectURL(imageFile);
  const [dimensions, setDimensions] = useState({ imgW: 0, imgH: 0, contW: 0, contH: 0 });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({
      imgW: img.naturalWidth,
      imgH: img.naturalHeight,
      contW: img.width,
      contH: img.height
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-700 aspect-video flex items-center justify-center">
        <img 
          src={imageUrl} 
          alt="Waste preview" 
          className="max-w-full max-h-[60vh] object-contain"
          onLoad={handleImageLoad}
        />
        
        {detections && dimensions.imgW > 0 && (
          <BoundingBoxOverlay 
            detections={detections}
            imageWidth={dimensions.imgW}
            imageHeight={dimensions.imgH}
            containerWidth={dimensions.contW}
            containerHeight={dimensions.contH}
          />
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium animate-pulse">AI is analyzing your waste...</p>
          </div>
        )}
      </div>

      {!detections && !isProcessing && (
        <div className="flex gap-4">
          <button 
            onClick={onRetake}
            className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" /> Retake
          </button>
          <button 
            onClick={onSubmit}
            className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            <CheckCircle2 className="w-5 h-5" /> Analyze Image
          </button>
        </div>
      )}
    </div>
  );
};
