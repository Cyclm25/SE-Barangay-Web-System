import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Camera, Upload, X, RotateCcw, Check, FlipHorizontal, ZoomIn, ZoomOut, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import * as faceapi from '@vladmandic/face-api';
const API_BASE = 'https://se-barangay-web-system.onrender.com';

interface ProfileImageUploadProps {
  residentId?: string;
  onImageReady?: (imageUrl: string, previewUrl: string, imageFile?: File | Blob) => void;
  currentImage?: string;
  size?: 'sm' | 'md' | 'lg';
  allowTransform?: boolean;
}

export function ProfileImageUpload({
  residentId,
  onImageReady,
  currentImage,
  size = 'md',
  allowTransform = true,
}: ProfileImageUploadProps) {
  const [preview, setPreview] = useState<string>(currentImage || '');
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'ocr'>('photo');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDetectingId, setIsDetectingId] = useState(false);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [isMirrored, setIsMirrored] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoDragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectionInProgressRef = useRef(false);
  const faceApiReadyRef = useRef(false);

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
    
  };
useEffect(() => {
  setPreview(currentImage || '');
  setPhotoOffset({ x: 0, y: 0 });
  setPhotoZoom(1);
}, [currentImage]);

  const onPhotoPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!allowTransform) return;
    if (!preview) return;
    photoDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: photoOffset.x,
      oy: photoOffset.y,
    };
    setIsDraggingPhoto(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
  }, [allowTransform, preview, photoOffset.x, photoOffset.y]);

  const onPhotoPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!allowTransform) return;
    if (!photoDragStartRef.current) return;
    const dx = e.clientX - photoDragStartRef.current.x;
    const dy = e.clientY - photoDragStartRef.current.y;
    const nextX = Math.max(-36, Math.min(36, photoDragStartRef.current.ox + dx));
    const nextY = Math.max(-36, Math.min(36, photoDragStartRef.current.oy + dy));
    setPhotoOffset({ x: nextX, y: nextY });
  }, []);

  const onPhotoPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!allowTransform) return;
    photoDragStartRef.current = null;
    setIsDraggingPhoto(false);
    (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
  }, [allowTransform]);

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
    if (autoScanTimeoutRef.current) {
      clearTimeout(autoScanTimeoutRef.current);
      autoScanTimeoutRef.current = null;
    }
    if (autoScanIntervalRef.current) {
      clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const looksLikeValidIdText = useCallback((text: string) => {
    const normalized = text.replace(/\s+/g, ' ').trim().toUpperCase();
    if (!normalized || normalized.length < 6) return false;

    const idKeywords = [
      'REPUBLIC OF THE PHILIPPINES',
      'PHILIPPINE IDENTIFICATION CARD',
      'DRIVER',
      'LICENSE',
      'UMID',
      'POSTAL',
      'PASSPORT',
      'NATIONAL ID',
      'PHILSYS',
      'BARANGAY',
      'RESIDENT',
      'LAST NAME',
      'FIRST NAME',
      'MIDDLE NAME',
      'MIDDLE INITIAL',
      'DATE OF BIRTH',
      'BIRTH DATE',
      'BIRTHDAY',
      'ADDRESS',
      'SEX',
      'NATIONALITY',
      'CIVIL STATUS',
      'ID NO',
      'IDENTIFICATION',
    ];

    const keywordHits = idKeywords.filter((keyword) => normalized.includes(keyword)).length;
    const hasDate = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(normalized) || /\b(?:19|20)\d{2}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/.test(normalized);
    const hasLikelyIdNumber = /\b[A-Z]{1,4}\d{3,}\b/.test(normalized) || /\b\d{5,}\b/.test(normalized);
    const hasNameField = /FIRST NAME|LAST NAME|MIDDLE|NAME\b/.test(normalized);
    const hasAddressField = /ADDRESS/.test(normalized);

    const hasAlnumMix = /[A-Z]/.test(normalized) && /\d/.test(normalized);

    return (
      keywordHits >= 2 ||
      (keywordHits >= 1 && (hasDate || hasLikelyIdNumber || hasNameField)) ||
      (hasNameField && (hasDate || hasAddressField || hasLikelyIdNumber)) ||
      (hasAlnumMix && (hasLikelyIdNumber || hasDate))
    );
  }, []);

  const getCroppedIdDataUrl = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) return null;

    const cropWidth = sourceWidth * 0.88;
    const cropHeight = sourceHeight * 0.7;
    const cropX = (sourceWidth - cropWidth) / 2;
    const cropY = (sourceHeight - cropHeight) / 2;
    canvas.width = Math.round(cropWidth);
    canvas.height = Math.round(cropHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const autoCropDetectedId = useCallback(async (imageSrc: string) => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageSrc);
        ctx.drawImage(img, 0, 0);

        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        let found = false;

        // Find likely card area by luminance (IDs are typically lighter than bg).
        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (lum > 95) {
              found = true;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!found) return resolve(imageSrc);

        const padX = Math.round((maxX - minX) * 0.04);
        const padY = Math.round((maxY - minY) * 0.06);
        const cropX = Math.max(0, minX - padX);
        const cropY = Math.max(0, minY - padY);
        const cropW = Math.min(width - cropX, maxX - minX + padX * 2);
        const cropH = Math.min(height - cropY, maxY - minY + padY * 2);

        if (cropW < width * 0.35 || cropH < height * 0.35) return resolve(imageSrc);

        const out = document.createElement('canvas');
        out.width = cropW;
        out.height = cropH;
        const outCtx = out.getContext('2d');
        if (!outCtx) return resolve(imageSrc);
        outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        resolve(out.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  }, []);

  const detectAndCropHumanFace = useCallback(async (imageSrc: string) => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const w = img.width;
          const h = img.height;
          if (!w || !h) return resolve(imageSrc);

          const anyWindow = window as any;
          if (typeof anyWindow.FaceDetector !== 'function') {
            return resolve(imageSrc);
          }

          const detector = new anyWindow.FaceDetector({
            fastMode: true,
            maxDetectedFaces: 1,
          });

          const sourceCanvas = document.createElement('canvas');
          sourceCanvas.width = w;
          sourceCanvas.height = h;
          const sourceCtx = sourceCanvas.getContext('2d');
          if (!sourceCtx) return resolve(imageSrc);
          sourceCtx.drawImage(img, 0, 0);

          const faces = await detector.detect(sourceCanvas);
          if (!faces || !faces.length || !faces[0]?.boundingBox) {
            return resolve(imageSrc);
          }

          const box = faces[0].boundingBox;
          const padX = box.width * 0.8;
          const padTop = box.height * 0.65;
          const padBottom = box.height * 1.25;

          const cropX = Math.max(0, Math.floor(box.x - padX));
          const cropY = Math.max(0, Math.floor(box.y - padTop));
          const cropW = Math.min(w - cropX, Math.ceil(box.width + padX * 2));
          const cropH = Math.min(h - cropY, Math.ceil(box.height + padTop + padBottom));

          if (cropW < 20 || cropH < 20) return resolve(imageSrc);

          const out = document.createElement('canvas');
          out.width = 640;
          out.height = 640;
          const outCtx = out.getContext('2d');
          if (!outCtx) return resolve(imageSrc);

          outCtx.imageSmoothingEnabled = true;
          outCtx.imageSmoothingQuality = 'high';
          outCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, out.width, out.height);
          resolve(out.toDataURL('image/jpeg', 0.95));
        } catch {
          resolve(imageSrc);
        }
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  }, []);

  const initFaceApiDetector = useCallback(async () => {
    if (faceApiReadyRef.current) return;
    try {
      const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';
      await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl);
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl);
      faceApiReadyRef.current = true;
    } catch (err) {
      console.error('FaceAPI detector init failed:', err);
    }
  }, []);

  const detectAndCropHumanFaceWithFaceApi = useCallback(async (imageSrc: string) => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          await initFaceApiDetector();
          if (!faceApiReadyRef.current) return resolve(imageSrc);

          const source = document.createElement('canvas');
          source.width = img.width;
          source.height = img.height;
          const sctx = source.getContext('2d');
          if (!sctx) return resolve(imageSrc);
          sctx.drawImage(img, 0, 0);

          const rotations = [0, 90, 180, 270];
          let bestCrop: string | null = null;
          let bestScore = -1;
          const getKeypoint = (detection: any, index: number) => {
            const kp = detection?.keypoints?.[index];
            if (!kp) return null;
            const x = typeof kp.x === 'number' ? kp.x : null;
            const y = typeof kp.y === 'number' ? kp.y : null;
            if (x == null || y == null) return null;
            return { x, y };
          };

          const hasPlausibleFaceGeometry = (detection: any) => {
            // MediaPipe Face Detector keypoints commonly include:
            // 0 left eye, 1 right eye, 2 nose tip, 3 mouth center, 4 left ear tragion, 5 right ear tragion
            const leftEye = getKeypoint(detection, 0);
            const rightEye = getKeypoint(detection, 1);
            const nose = getKeypoint(detection, 2);
            const mouth = getKeypoint(detection, 3);
            if (!leftEye || !rightEye || !nose || !mouth) return false;

            const eyeDx = Math.abs(rightEye.x - leftEye.x);
            const eyeDy = Math.abs(rightEye.y - leftEye.y);
            const eyeDistance = Math.hypot(eyeDx, eyeDy);
            if (eyeDistance < 10) return false;

            const eyeMidX = (leftEye.x + rightEye.x) / 2;
            const eyeMidY = (leftEye.y + rightEye.y) / 2;

            // Nose should be roughly below eye midpoint, mouth below nose.
            if (nose.y <= eyeMidY - 4) return false;
            if (mouth.y <= nose.y + 2) return false;

            // Nose should be between eyes horizontally with tolerance.
            const minEyeX = Math.min(leftEye.x, rightEye.x) - eyeDistance * 0.35;
            const maxEyeX = Math.max(leftEye.x, rightEye.x) + eyeDistance * 0.35;
            if (nose.x < minEyeX || nose.x > maxEyeX) return false;

            return true;
          };

          const renderCrop = (
            canvas: HTMLCanvasElement,
            originX: number,
            originY: number,
            width: number,
            height: number
          ) => {
            // Build an ID-photo-slot crop around the face (portrait-like box),
            // not just a tight face box.
            const targetAspect = 0.75; // width / height, close to common ID photo ratio (3:4)
            let slotW = width * 2.2;
            let slotH = height * 2.9;
            if (slotW / slotH > targetAspect) {
              slotH = slotW / targetAspect;
            } else {
              slotW = slotH * targetAspect;
            }

            const faceCenterX = originX + width / 2;
            const faceCenterY = originY + height / 2;
            const slotCenterX = faceCenterX;
            const slotCenterY = faceCenterY + height * 0.28;

            let cropX = Math.floor(slotCenterX - slotW / 2);
            let cropY = Math.floor(slotCenterY - slotH / 2);
            let cropW = Math.ceil(slotW);
            let cropH = Math.ceil(slotH);

            if (cropX < 0) cropX = 0;
            if (cropY < 0) cropY = 0;
            if (cropX + cropW > canvas.width) cropW = canvas.width - cropX;
            if (cropY + cropH > canvas.height) cropH = canvas.height - cropY;
            if (cropW < 24 || cropH < 24) return null;

            const out = document.createElement('canvas');
            out.width = 640;
            out.height = 640;
            const octx = out.getContext('2d');
            if (!octx) return null;
            octx.imageSmoothingEnabled = true;
            octx.imageSmoothingQuality = 'high';
            octx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, out.width, out.height);
            return out.toDataURL('image/jpeg', 0.95);
          };

          for (const angle of rotations) {
            const rotated = document.createElement('canvas');
            const rctx = rotated.getContext('2d');
            if (!rctx) continue;

            if (angle === 90 || angle === 270) {
              rotated.width = source.height;
              rotated.height = source.width;
            } else {
              rotated.width = source.width;
              rotated.height = source.height;
            }

            rctx.save();
            if (angle === 90) {
              rctx.translate(rotated.width, 0);
              rctx.rotate(Math.PI / 2);
            } else if (angle === 180) {
              rctx.translate(rotated.width, rotated.height);
              rctx.rotate(Math.PI);
            } else if (angle === 270) {
              rctx.translate(0, rotated.height);
              rctx.rotate(-Math.PI / 2);
            }
            rctx.drawImage(source, 0, 0);
            rctx.restore();

            const detections = await faceapi
              .detectAllFaces(rotated, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }))
              .withFaceLandmarks(true);
            for (const detection of detections) {
              const box = detection?.detection?.box;
              if (!box) continue;
              const confidence = detection?.detection?.score ?? 0;
              const keypoints = detection?.landmarks?.positions ?? [];

              // Reject weak/non-face-like detections (logos/text often fail these checks).
              if (confidence < 0.7) continue;
              if (keypoints.length < 4) continue;
              if (keypoints.length < 20) continue;

              const areaRatio = (box.width * box.height) / (rotated.width * rotated.height);
              if (areaRatio < 0.01 || areaRatio > 0.55) continue;

              const aspect = box.width / Math.max(1, box.height);
              if (aspect < 0.45 || aspect > 1.6) continue;

              const score = confidence * (0.6 + Math.min(areaRatio, 0.2));
              const candidate = renderCrop(rotated, box.x, box.y, box.width, box.height);
              if (!candidate) continue;
              if (score > bestScore) {
                bestScore = score;
                bestCrop = candidate;
              }
            }
          }

          resolve(bestCrop || imageSrc);
        } catch {
          resolve(imageSrc);
        }
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  }, [initFaceApiDetector]);

  const dataUrlToBlob = useCallback((dataUrl: string) => {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
    const bytes = atob(base64);
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) {
      array[i] = bytes.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  }, []);

  const saveTransformedPhoto = useCallback(() => {
    console.debug('[ProfileImageUpload] Save Image clicked');
    if (!preview) {
      toast.error('No image to save.');
      return;
    }
    console.debug('[ProfileImageUpload] cropped image source exists:', !!preview);
    const img = new Image();
    img.onload = () => {
      const out = document.createElement('canvas');
      out.width = 420;
      out.height = 520;
      const ctx = out.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const scale = photoZoom;
      const sw = img.width / scale;
      const sh = img.height / scale;
      const sx = Math.max(0, Math.min(img.width - sw, ((img.width - sw) / 2) - (photoOffset.x * 3)));
      const sy = Math.max(0, Math.min(img.height - sh, ((img.height - sh) / 2) - (photoOffset.y * 3)));
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);

      const finalData = out.toDataURL('image/jpeg', 0.9);
      const blob = dataUrlToBlob(finalData);
      const file = new File([blob], 'resident-id-photo.jpg', { type: blob.type || 'image/jpeg' });
      console.debug('[ProfileImageUpload] converted image file/blob created', { type: file.type, size: file.size });
      setPreview(finalData);
      setPhotoOffset({ x: 0, y: 0 });
      setPhotoZoom(1);
      onImageReady?.(finalData, finalData, file);
      console.debug('[ProfileImageUpload] resident form image state updated');
      console.debug('[ProfileImageUpload] image ready for submission');
      toast.success('Image saved successfully.');
    };
    img.src = preview;
  }, [preview, photoZoom, photoOffset.x, photoOffset.y, onImageReady, dataUrlToBlob]);

  const scanIdTextWithBackendOcr = useCallback(async (imageSrc: string) => {
    const formData = new FormData();
    formData.append('idImage', dataUrlToBlob(imageSrc), 'profile-id-scan.jpg');
    const response = await fetch(`${API_BASE}/api/id-ocr/scan-image`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to scan ID.');
    }
    return String(data?.text || '');
  }, [dataUrlToBlob]);

  const detectAndCaptureId = useCallback(async (silent = false) => {
    const croppedFrame = getCroppedIdDataUrl();
    if (!croppedFrame) return false;

    detectionInProgressRef.current = true;
    setIsDetectingId(true);
    try {
      const candidates = [croppedFrame];
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            candidates.push(canvas.toDataURL('image/jpeg', 0.9));
          }
        }
      }
      const img = new Image();
      const preload = new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      img.src = croppedFrame;
      await preload;
      if (img.width && img.height) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < data.data.length; i += 4) {
            const avg = (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 3;
            const enhanced = Math.max(0, Math.min(255, (avg - 120) * 2.0 + 128));
            data.data[i] = enhanced;
            data.data[i + 1] = enhanced;
            data.data[i + 2] = enhanced;
          }
          ctx.putImageData(data, 0, 0);
          candidates.push(canvas.toDataURL('image/jpeg', 0.95));

          // Upscaled grayscale candidate improves tiny-text OCR on IDs.
          const upscaled = document.createElement('canvas');
          upscaled.width = canvas.width * 2;
          upscaled.height = canvas.height * 2;
          const upCtx = upscaled.getContext('2d');
          if (upCtx) {
            upCtx.imageSmoothingEnabled = true;
            upCtx.imageSmoothingQuality = 'high';
            upCtx.drawImage(canvas, 0, 0, upscaled.width, upscaled.height);
            candidates.push(upscaled.toDataURL('image/jpeg', 0.95));
          }
        }
      }

      let detected = false;
      for (const src of candidates) {
        const text = await scanIdTextWithBackendOcr(src);
        if (looksLikeValidIdText(text || '')) {
          detected = true;
          break;
        }
      }

      if (!detected) {
        if (!silent) {
          toast.error('No valid ID detected.', {
            description: 'Try better lighting, avoid glare, hold the card steady, and make sure the full ID is visible in frame.',
          });
        }
        return false;
      }
      let fullFrameSrc: string | null = null;
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            fullFrameSrc = canvas.toDataURL('image/jpeg', 0.95);
          }
        }
      }

      const tightlyCropped = await autoCropDetectedId(croppedFrame);
      const sourcesToTry = [tightlyCropped, croppedFrame, fullFrameSrc].filter(Boolean) as string[];

      let bestFaceCrop: string | null = null;
      for (const src of sourcesToTry) {
        const faceApiCrop = await detectAndCropHumanFaceWithFaceApi(src);
        if (faceApiCrop !== src) {
          bestFaceCrop = faceApiCrop;
          break;
        }
      }

      // Do not fallback to permissive detector here; better fail than save non-face crops.
      const finalCrop = bestFaceCrop;
      if (!finalCrop) {
        if (!silent) {
          toast.error('Face not detected clearly.', {
            description: 'Retake with the ID closer, brighter lighting, and less tilt so the portrait is visible.',
          });
        }
        return false;
      }

      setCapturedImage(finalCrop);
      stopCamera();
      if (!silent) toast.success('ID detected and captured.');
      return true;
    } catch {
      if (!silent) toast.error('Failed to scan ID. Please try again.');
      return false;
    } finally {
      setIsDetectingId(false);
      detectionInProgressRef.current = false;
    }
  }, [getCroppedIdDataUrl, looksLikeValidIdText, stopCamera, autoCropDetectedId, detectAndCropHumanFaceWithFaceApi, detectAndCropHumanFace, scanIdTextWithBackendOcr]);

  useEffect(() => {
    void initFaceApiDetector();
    return () => {
      faceApiReadyRef.current = false;
    };
  }, [initFaceApiDetector]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) return;

    // For Scan ID mode, capture only the ID guide area (same area as yellow frame).
    if (cameraMode === 'ocr') {
      void detectAndCaptureId(false);
      return;
    } else {
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
    }
    if (cameraMode !== 'ocr') {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
    }
    stopCamera();
  }, [stopCamera, cameraMode, detectAndCaptureId]);

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

  const requestCameraAccess = useCallback(
    async (mode: 'photo' | 'ocr') => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Camera access is not supported in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode === 'photo' ? 'user' : 'environment' },
        });

        stream.getTracks().forEach((track) => track.stop());
        openCamera(mode);
      } catch (err) {
        console.error(err);
        toast.error('Camera permission was denied. Please allow access to continue.');
      }
    },
    []
  );

  const closeCamera = () => {
    stopCamera();
    setShowCameraDialog(false);
    setCapturedImage(null);
  };

  const clearPhoto = () => {
    const confirmed = window.confirm("Are you sure to remove the profile photo of this resident?");
    if (!confirmed) return;
    setPreview('');
    onImageReady?.('', '');
  };

  useEffect(() => {
    if (cameraMode !== 'ocr' || !capturedImage || isUploading) return;
    confirmCapture();
  }, [cameraMode, capturedImage, isUploading]);

  useEffect(() => {
    if (cameraMode !== 'ocr' || !showCameraDialog || !isCameraActive || capturedImage) return;
    if (autoScanTimeoutRef.current) clearTimeout(autoScanTimeoutRef.current);
    if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    autoScanTimeoutRef.current = setTimeout(async () => {
      if (detectionInProgressRef.current) return;
      const runDetect = async () => {
        if (detectionInProgressRef.current) return;
        detectionInProgressRef.current = true;
        setIsDetectingId(true);
        try {
          const ok = await detectAndCaptureId(true);
          if (ok) {
            toast.success('ID detected and auto-captured.');
            if (autoScanIntervalRef.current) {
              clearInterval(autoScanIntervalRef.current);
              autoScanIntervalRef.current = null;
            }
          }
        } finally {
          setIsDetectingId(false);
          detectionInProgressRef.current = false;
        }
      };

      await runDetect();
      autoScanIntervalRef.current = setInterval(runDetect, 1400);
    }, 900);

    return () => {
      if (autoScanTimeoutRef.current) {
        clearTimeout(autoScanTimeoutRef.current);
        autoScanTimeoutRef.current = null;
      }
      if (autoScanIntervalRef.current) {
        clearInterval(autoScanIntervalRef.current);
        autoScanIntervalRef.current = null;
      }
    };
  }, [cameraMode, showCameraDialog, isCameraActive, capturedImage, detectAndCaptureId]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Profile Picture Preview */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full bg-gray-100 border-2 border-[#2957a1] overflow-hidden flex items-center justify-center`}
          onPointerDown={onPhotoPointerDown}
          onPointerMove={onPhotoPointerMove}
          onPointerUp={onPhotoPointerUp}
          onPointerCancel={onPhotoPointerUp}
        >
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              className="w-full h-full object-contain select-none bg-black/5"
              draggable={false}
              style={{
                transform: allowTransform
                  ? `translate(${photoOffset.x}px, ${photoOffset.y}px) scale(${photoZoom})`
                  : `translate(0px, 0px) scale(1)`,
                cursor: allowTransform ? (isDraggingPhoto ? 'grabbing' : 'grab') : 'default',
              }}
            />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <Camera className="w-8 h-8" />
              <span className="text-[10px] mt-1">No Photo</span>
            </div>
          )}
        </div>
        {preview && (
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center shadow-sm"
            aria-label="Remove photo"
            title="Remove photo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {preview && allowTransform && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPhotoZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}>
            <ZoomOut className="w-3.5 h-3.5 mr-1" /> Zoom Out
          </Button>
          <span className="text-[11px] text-gray-600 w-12 text-center">{Math.round(photoZoom * 100)}%</span>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPhotoZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}>
            <ZoomIn className="w-3.5 h-3.5 mr-1" /> Zoom In
          </Button>
          <Button type="button" size="sm" className="h-7 px-2 text-xs bg-[#2957a1] hover:bg-[#1e3f7a]" onClick={saveTransformedPhoto}>
            <Save className="w-3.5 h-3.5 mr-1" /> Save Image
          </Button>
        </div>
      )}
      {preview && !allowTransform && (
        <div className="text-[11px] text-gray-600">Photo locked to frame</div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex items-center gap-1 text-xs border-[#2957a1] bg-gray-50 text-[#2957a1] hover:bg-gray-100"
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
          className="flex items-center gap-1 text-xs border-green-600 bg-gray-50 text-green-700 hover:bg-gray-100"
          onClick={() => requestCameraAccess('photo')}
        >
          <Camera className="w-3.5 h-3.5" />
          Take Photo
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
                Position the ID clearly within the frame. Only the image shown in this scanner will be used.
              </p>
            )}

            {!capturedImage && (
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
                />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                    Starting camera...
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
                  {cameraMode !== 'ocr' && (
                    <Button type="button" variant="outline" onClick={() => setIsMirrored((v) => !v)}>
                      <FlipHorizontal className="w-4 h-4 mr-2" />
                      {isMirrored ? 'Flip Off' : 'Flip On'}
                    </Button>
                  )}
                  {cameraMode !== 'ocr' && (
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      disabled={!isCameraActive}
                      className="bg-[#2957a1] hover:bg-[#1e3f7a] text-white"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Capture
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={closeCamera}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {cameraMode !== 'ocr' && (
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
                    </>
                  )}
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
