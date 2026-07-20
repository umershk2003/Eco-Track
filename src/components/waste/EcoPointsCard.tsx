import React from 'react';
import { Leaf, Award } from 'lucide-react';

export const EcoPointsCard: React.FC<{ points: number }> = ({ points }) => {
  if (points <= 0) return null;

  return (
    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 text-center animate-pulse-slow">
      <div className="inline-flex items-center justify-center p-4 bg-green-500/20 rounded-full mb-3">
        <Award className="w-10 h-10 text-green-400" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">+{points} Eco Points!</h3>
      <p className="text-green-200/80 text-sm">Awarded for proper waste sorting</p>
    </div>
  );
};
