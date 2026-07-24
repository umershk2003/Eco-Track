import React from 'react';
import { Leaf, AlertTriangle, Recycle, Trash2 } from 'lucide-react';

interface FormattedDetection {
  class_name: string;
  confidence: number;
  category: string;
  recyclable: boolean;
  disposalMethod: string;
  decompositionTime: string;
  ecoPoints: number;
}

interface DetectionCardProps {
  detection: FormattedDetection;
}

export const DetectionCard: React.FC<DetectionCardProps> = ({ detection }) => {
  const isHazardous = detection.category === 'Hazardous Waste';
  
  return (
    <div className={`p-4 rounded-xl border ${isHazardous ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-800/60 border-gray-700/60'} backdrop-blur-sm transition hover:shadow-lg flex items-start gap-4`}>
      <div className={`p-3 rounded-full ${detection.recyclable ? 'bg-green-500/20 text-green-400' : isHazardous ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'}`}>
        {detection.recyclable ? <Recycle className="w-6 h-6" /> : isHazardous ? <AlertTriangle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-white capitalize">{detection.class_name.replace('_', ' ')}</h3>
          <span className="text-xs font-mono bg-black/40 px-2 py-1 rounded text-gray-400">
            {(detection.confidence * 100).toFixed(1)}% Conf
          </span>
        </div>
        
        <p className={`text-sm mt-1 ${isHazardous ? 'text-red-300 font-medium' : 'text-gray-400'}`}>
          {detection.category} • {detection.decompositionTime}
        </p>
        
        <div className="mt-3 p-3 bg-black/30 rounded-lg border border-white/5 text-sm text-gray-300 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${detection.recyclable ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          {detection.disposalMethod}
        </div>
      </div>
      
      {detection.ecoPoints > 0 && (
        <div className="flex flex-col items-center justify-center p-3 bg-green-500/10 rounded-lg border border-green-500/20 h-full">
          <Leaf className="w-5 h-5 text-green-400 mb-1" />
          <span className="text-green-400 font-bold">+{detection.ecoPoints}</span>
        </div>
      )}
    </div>
  );
};
