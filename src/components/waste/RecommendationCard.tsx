import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface RecommendationCardProps {
  summary: {
    totalObjects: number;
    recyclable: number;
    hazardous: number;
    organic: number;
  }
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ summary }) => {
  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900 border border-gray-700/50 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <ShieldCheck className="w-32 h-32 text-blue-500" />
      </div>
      
      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
        <Info className="w-6 h-6 text-blue-400" /> Analysis Summary
      </h3>
      
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
          <p className="text-gray-400 text-sm font-medium mb-1">Total Items</p>
          <p className="text-3xl font-bold text-white">{summary.totalObjects}</p>
        </div>
        
        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
          <p className="text-gray-400 text-sm font-medium mb-1">Recyclable</p>
          <p className="text-3xl font-bold text-green-400">{summary.recyclable}</p>
        </div>
        
        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
          <p className="text-gray-400 text-sm font-medium mb-1">Hazardous</p>
          <p className="text-3xl font-bold text-red-400">{summary.hazardous}</p>
        </div>
        
        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
          <p className="text-gray-400 text-sm font-medium mb-1">Organic</p>
          <p className="text-3xl font-bold text-yellow-500">{summary.organic}</p>
        </div>
      </div>
    </div>
  );
};
