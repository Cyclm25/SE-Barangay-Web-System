import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Camera, Upload, X, RotateCcw, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
const API_BASE = 'http://localhost:5001';

interface ProfileImageUploadProps {
  residentId?: string;
  onImageReady?: (imageUrl: string, previewUrl: string) => void;
  currentImage?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProfileImageUpload({
  residentId,
  onImageReady,
  currentImage,
  size = 'md',
}: ProfileImageUploadProps) {
  const [preview, setPreview] = useState<string>(currentImage || '');
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'ocr'>('photo');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
    
  };
useEffect(() => {
  setPreview(currentImage || '');
}, [currentImage]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setCapturedImage(null);
    } catch (err) {
      toast.error('Could not access camera. Please allow camera permissions.');
      console.error(err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  // For EXISTING residents only - upload to backend
  const uploadToBackend = useCallback(
    async (file: File | Blob, filename = 'photo.jpg') => {
      setIsUploading(true);
      try {
        const token = localStorage.getItem('token') || '';
        const formData = new FormData();
        formData.append('profileImage', file, filename);

        const res = await fetch(`${API_BASE}/api/upload/profile-picture/${residentId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Upload failed');

        const imageUrl = data.imageUrl;
        const fullUrl = `${API_BASE}${imageUrl}`;
        setPreview(fullUrl);
        onImageReady?.(imageUrl, fullUrl);
        toast.success('Profile picture updated!');
        setShowCameraDialog(false);
        setCapturedImage(null);
      } catch (err: any) {
        toast.error(err.message || 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [residentId, onImageReady]
  );

  // For NEW residents - just use base64, no backend call needed
  const useImageLocally = useCallback(
    (dataUrl: string) => {
      setPreview(dataUrl);
      onImageReady?.(dataUrl, dataUrl);
      toast.success('Photo ready!');
      setShowCameraDialog(false);
      setCapturedImage(null);
    },
    [onImageReady]
  );

  // Handle file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (residentId) {
      // Existing resident → upload to server
      uploadToBackend(file, file.name);
    } else {
      // New resident → convert to base64 locally, no server call
      const reader = new FileReader();
      reader.onloadend = () => {
        useImageLocally(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture confirm
  const confirmCapture = () => {
    if (!capturedImage) return;

    if (residentId) {
      // Existing resident → upload to server
      if (!canvasRef.current) return;
      canvasRef.current.toBlob(
        (blob) => {
          if (blob) uploadToBackend(blob, `camera-${Date.now()}.jpg`);
        },
        'image/jpeg',
        0.9
      );
    } else {
      // New resident → use base64 locally, no server call
      useImageLocally(capturedImage);
    }
  };

  const openCamera = (mode: 'photo' | 'ocr') => {
    setCameraMode(mode);
    setShowCameraDialog(true);
    setCapturedImage(null);
    setTimeout(() => startCamera(), 300);
  };

  const closeCamera = () => {
    stopCamera();
    setShowCameraDialog(false);
    setCapturedImage(null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Profile Picture Preview */}
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-100 border-2 border-[#2957a1] overflow-hidden flex items-center justify-center`}
      >
        {preview ? (
          <img src={preview} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <Camera className="w-8 h-8" />
            <span className="text-[10px] mt-1">No Photo</span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex items-center gap-1 text-xs border-[#2957a1] text-[#2957a1] hover:bg-blue-50"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" />
          From Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex items-center gap-1 text-xs border-green-600 text-green-700 hover:bg-green-50"
          onClick={() => openCamera('photo')}
        >
          <Camera className="w-3.5 h-3.5" />
          Take Photo
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex items-center gap-1 text-xs border-orange-500 text-orange-600 hover:bg-orange-50"
          onClick={() => openCamera('ocr')}
        >
          <Camera className="w-3.5 h-3.5" />
          Scan ID
        </Button>
      </div>

      {isUploading && (
        <p className="text-xs text-blue-600 animate-pulse">Uploading...</p>
      )}

      {/* Camera Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={closeCamera}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {cameraMode === 'photo' ? '📷 Take Profile Photo' : '🪪 Scan ID / Document'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {cameraMode === 'ocr' && (
              <p className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                Position the ID clearly within the frame and capture.
              </p>
            )}

            {!capturedImage && (
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                    Starting camera...
                  </div>
                )}
                {cameraMode === 'ocr' && isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-yellow-400 border-dashed rounded-lg w-4/5 h-3/5 opacity-70" />
                  </div>
                )}
              </div>
            )}

            {capturedImage && (
              <div className="relative rounded-lg overflow-hidden aspect-video bg-black">
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-center gap-3">
              {!capturedImage ? (
                <>
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!isCameraActive}
                    className="bg-[#2957a1] hover:bg-[#1e3f7a] text-white"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                  <Button type="button" variant="outline" onClick={closeCamera}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={confirmCapture}
                    disabled={isUploading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Use This Photo'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCapturedImage(null);
                      startCamera();
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button type="button" variant="outline" onClick={closeCamera}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}