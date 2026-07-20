import React, { useRef, useState, useCallback } from 'react';
import { Camera, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      setError('Could not access camera. Please check permissions.');
      console.error(err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsStreaming(false);
    }
  }, []);

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
            stopCamera();
            onCapture(file);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 text-white">
        <h2 className="text-xl font-semibold">Take a Photo</h2>
        <button onClick={() => { stopCamera(); onClose(); }} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-red-400 p-4 text-center">{error}</div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="max-h-full max-w-full object-contain"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-6 pb-12 flex justify-center items-center bg-black">
        <button 
          onClick={captureImage}
          disabled={!isStreaming}
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-full bg-white transition hover:scale-95"></div>
        </button>
      </div>
    </div>
  );
};
