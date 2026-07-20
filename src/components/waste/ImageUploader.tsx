import React, { useCallback, useState } from 'react';
import { UploadCloud, Camera, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  onOpenCamera: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, onOpenCamera }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const validateFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file format. Please use JPG, PNG, or WEBP.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return false;
    }
    setError('');
    return true;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div 
        className={`relative group border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          isDragging ? 'border-green-500 bg-green-50/10' : 'border-gray-600/50 hover:border-green-400 bg-white/5 hover:bg-white/10'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept="image/jpeg,image/png,image/webp" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-green-500/20 rounded-full group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10 text-green-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-white">Drag & drop your waste image here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse from device</p>
          </div>
          <div className="text-xs text-gray-500 font-mono bg-gray-800 px-3 py-1 rounded-full">
            JPG, PNG, WEBP up to 10MB
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center">
          <span className="mr-2">⚠️</span> {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="h-px bg-gray-700 flex-1"></div>
        <span className="text-gray-500 text-sm font-medium">OR</span>
        <div className="h-px bg-gray-700 flex-1"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={onOpenCamera}
          className="flex flex-col items-center justify-center p-4 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 rounded-xl transition group"
        >
          <Camera className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition" />
          <span className="text-sm font-medium text-gray-300">Open Camera</span>
        </button>
        <button 
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png,image/webp';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file && validateFile(file)) onFileSelect(file);
            };
            input.click();
          }}
          className="flex flex-col items-center justify-center p-4 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 rounded-xl transition group"
        >
          <ImageIcon className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition" />
          <span className="text-sm font-medium text-gray-300">Gallery</span>
        </button>
      </div>
    </div>
  );
};
