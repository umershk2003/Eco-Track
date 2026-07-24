import React, { useState } from 'react';
import { CameraCapture } from './CameraCapture';
import { ImageUploader } from './ImageUploader';
import { ImagePreview } from './ImagePreview';
import { DetectionCard } from './DetectionCard';
import { RecommendationCard } from './RecommendationCard';
import { EcoPointsCard } from './EcoPointsCard';
import { ArrowLeft } from 'lucide-react';

export const DetectionViewer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  const handleProcessImage = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      // In real scenario, would be hitting the proxy/backend route we created
      const res = await fetch('/api/ai/detect', {
        method: 'POST',
        // Example mock token or handled by cookie session
        headers: {
          'Authorization': `Bearer fake_token_for_now`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to detect waste');
      }
    } catch (err) {
      setError('Network error occurred during processing.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
              AI Waste Detection
            </h1>
            <p className="text-gray-400 mt-2">Scan waste to earn Eco Points and learn how to recycle.</p>
          </div>
          {file && !isProcessing && (
             <button onClick={resetState} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition bg-gray-900 px-4 py-2 rounded-lg border border-gray-800">
               <ArrowLeft className="w-4 h-4" /> Start Over
             </button>
          )}
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {showCamera && (
          <CameraCapture 
            onCapture={(f) => { setFile(f); setShowCamera(false); }} 
            onClose={() => setShowCamera(false)} 
          />
        )}

        {!file && !showCamera && (
          <ImageUploader 
            onFileSelect={setFile} 
            onOpenCamera={() => setShowCamera(true)} 
          />
        )}

        {file && (
          <div className="grid md:grid-cols-[1fr_350px] gap-8 items-start">
            <div className="space-y-6">
              <ImagePreview 
                imageFile={file}
                onRetake={resetState}
                onSubmit={handleProcessImage}
                isProcessing={isProcessing}
                detections={result?.detections}
              />
            </div>

            {result && result.success && (
              <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                <EcoPointsCard points={result.summary.ecoPoints} />
                
                <RecommendationCard summary={result.summary} />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-gray-800 pb-2">Detected Items</h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {result.detections.map((det: any, idx: number) => (
                      <DetectionCard key={idx} detection={det} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
