import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Loader2, Zap, FlipHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { api } from './utils/api';
import { cleanupOcrText, assessImageQuality, hasLowOcrConfidence } from './utils/ocrCleanup';


interface OcrScannerProps {
  onDataExtracted: (text: string) => void;
  onImageCaptured?: (imageDataUrl: string) => void;
  onScanSuccess?: (payload: {
    ocrData: string;
    croppedPhoto: string;
    confidence: number;
    detectedIdType: string;
  }) => void;
}


export default function OcrScanner({ onDataExtracted, onImageCaptured, onScanSuccess }: OcrScannerProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState('');
  const [isMirrored, setIsMirrored] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const autoScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameAnalyzeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stableFramesRef = useRef(0);
  const lastGuidanceToastRef = useRef(0);
  const analyzeFrameCountRef = useRef(0);
  const noAutoDetectSinceRef = useRef<number | null>(null);
  const lastCaptureAtRef = useRef(0);
  const lastAutoFallbackAttemptRef = useRef(0);
  const bestFrameRef = useRef<{ image: string; score: number } | null>(null);
  const lastSuccessfulTextRef = useRef('');
  const successDispatchRef = useRef(false);
  const isMountedRef = useRef(true);
  const [liveStatus, setLiveStatus] = useState('Looking for ID card...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearAutoScanTimeout = useCallback(() => {
    if (autoScanTimeoutRef.current) {
      clearTimeout(autoScanTimeoutRef.current);
      autoScanTimeoutRef.current = null;
    }
  }, []);

  const looksLikeValidIdText = useCallback((text: string) => {
    const normalized = text.replace(/\s+/g, ' ').trim().toUpperCase();
    if (!normalized || normalized.length < 20) {
      return false;
    }

    // Check for low confidence indicators
    if (hasLowOcrConfidence(normalized)) {
      return false;
    }

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
      'LAST NAME',
      'FIRST NAME',
      'MIDDLE NAME',
      'DATE OF BIRTH',
      'BIRTH DATE',
      'ADDRESS',
      'SEX',
      'NATIONALITY',
      'PERSON WITH DISABILITY',
      'PWD',
      'SENIOR CITIZEN',
      'OSCA',
    ];

    const keywordHits = idKeywords.filter((keyword) =>
      normalized.includes(keyword)
    ).length;
    const hasDate = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(normalized);
    const hasLikelyIdNumber =
      /\b[A-Z]{1,4}\d{4,}\b/.test(normalized) || /\b\d{6,}\b/.test(normalized);

    return keywordHits >= 2 || (keywordHits >= 1 && (hasDate || hasLikelyIdNumber));
  }, []);

  const captureCroppedFrame = useCallback(() => {
    const video = webcamRef.current?.video;
    if (!video || video.readyState < 2) {
      return null;
    }

    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    const cropWidth = sourceWidth * 0.94;
    const cropHeight = cropWidth / 1.58;
    const finalCropHeight = Math.min(cropHeight, sourceHeight * 0.82);
    const cropX = (sourceWidth - cropWidth) / 2;
    const cropY = (sourceHeight - finalCropHeight) / 2;

    canvas.width = 1800;
    canvas.height = Math.round(1800 / 1.58);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      finalCropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL('image/jpeg', 1);
  }, []);

  const preprocessImage = useCallback((imageSrc: string) => {
    return new Promise<string[]>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const makeCanvas = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(img, 0, 0);
          return { canvas, ctx };
        };

        const base = makeCanvas();
        const contrast = makeCanvas();
        const threshold = makeCanvas();

        if (!base || !contrast || !threshold) {
          resolve([imageSrc]);
          return;
        }

        const contrastData = contrast.ctx.getImageData(
          0,
          0,
          contrast.canvas.width,
          contrast.canvas.height
        );
        const thresholdData = threshold.ctx.getImageData(
          0,
          0,
          threshold.canvas.width,
          threshold.canvas.height
        );

        for (let i = 0; i < contrastData.data.length; i += 4) {
          const avg =
            (contrastData.data[i] +
              contrastData.data[i + 1] +
              contrastData.data[i + 2]) /
            3;
          const enhanced = Math.max(0, Math.min(255, (avg - 110) * 2.2 + 128));
          contrastData.data[i] = enhanced;
          contrastData.data[i + 1] = enhanced;
          contrastData.data[i + 2] = enhanced;

          const thresholded = avg > 145 ? 255 : 0;
          thresholdData.data[i] = thresholded;
          thresholdData.data[i + 1] = thresholded;
          thresholdData.data[i + 2] = thresholded;
        }

        contrast.ctx.putImageData(contrastData, 0, 0);
        threshold.ctx.putImageData(thresholdData, 0, 0);

        resolve([
          imageSrc,
          contrast.canvas.toDataURL('image/jpeg', 1),
          threshold.canvas.toDataURL('image/jpeg', 1),
        ]);
      };
      img.onerror = () => resolve([imageSrc]);
      img.src = imageSrc;
    });
  }, []);

  const detectIdTypeQuick = useCallback((text: string) => {
    const t = String(text || "").toUpperCase();
    if (/\bP<PHL\b|\bPASSPORT\b/.test(t)) return "PASSPORT";
    if (/\bUMID\b|\bCRN\b/.test(t)) return "UMID";
    if (/\bPHILSYS\b|\bPHILIPPINE IDENTIFICATION CARD\b|\bNATIONAL ID\b/.test(t)) return "PHILSYS_NATIONAL_ID";
    if (/\bDRIVER'?S LICENSE\b|\bLAND TRANSPORTATION OFFICE\b|\bLTO\b/.test(t)) return "DRIVERS_LICENSE";
    if (/\bPOSTAL ID\b|\bPHILPOST\b/.test(t)) return "POSTAL_ID";
    if (/\bPERSON WITH DISABILITY\b|\bPWD\b/.test(t)) return "MANILA_PWD_ID";
    if (/\bSENIOR CITIZEN\b|\bOSCA\b/.test(t)) return "MANILA_SENIOR_CITIZEN_ID";
    return "UNKNOWN";
  }, []);

  const clearFrameAnalyzeInterval = useCallback(() => {
    if (frameAnalyzeIntervalRef.current) {
      clearInterval(frameAnalyzeIntervalRef.current);
      frameAnalyzeIntervalRef.current = null;
    }
    stableFramesRef.current = 0;
  }, []);

  const cropIdCardRegion = useCallback((imageSrc: string) => {
    return new Promise<{ image: string; detected: boolean }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ image: imageSrc, detected: false });
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        let found = false;
        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const i = (y * width + x) * 4;
            const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            if (lum > 90) {
              found = true;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!found) return resolve({ image: imageSrc, detected: false });
        const padX = Math.round((maxX - minX) * 0.05);
        const padY = Math.round((maxY - minY) * 0.06);
        const cropX = Math.max(0, minX - padX);
        const cropY = Math.max(0, minY - padY);
        const cropW = Math.min(width - cropX, maxX - minX + padX * 2);
        const cropH = Math.min(height - cropY, maxY - minY + padY * 2);
        if (cropW < width * 0.18 || cropH < height * 0.14) {
          return resolve({ image: imageSrc, detected: false });
        }

        const out = document.createElement('canvas');
        out.width = cropW;
        out.height = cropH;
        const outCtx = out.getContext('2d');
        if (!outCtx) return resolve({ image: imageSrc, detected: false });
        outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        resolve({ image: out.toDataURL('image/jpeg', 0.95), detected: true });
      };
      img.onerror = () => resolve({ image: imageSrc, detected: false });
      img.src = imageSrc;
    });
  }, []);

  const isBlurryDataUrl = useCallback(async (imageSrc: string) => {
    const q = await assessImageQuality(imageSrc);
    return q.isBlurry;
  }, []);

  const detectCardInFrame = useCallback((imageSrc: string) => {
    return new Promise<{ ok: boolean; guidance: string; debug: string }>((resolve) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ ok: false, guidance: 'Looking for ID card...', debug: 'ctx unavailable' });
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        let brightCount = 0;
        let edgeCount = 0;
        let prevLum = 0;

        for (let y = 0; y < height; y += 3) {
          for (let x = 0; x < width; x += 3) {
            const i = (y * width + x) * 4;
            const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            if (x > 0 && Math.abs(lum - prevLum) > 24) edgeCount += 1;
            prevLum = lum;
            if (lum > 88) {
              brightCount += 1;
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        const areaFraction = brightCount / Math.max(1, (width * height) / 9);
        const textLikeDensity = edgeCount / Math.max(1, (width * height) / 9);

        if (brightCount < (width * height) / 420) {
          return resolve({ ok: false, guidance: 'Looking for ID card...', debug: 'insufficient bright region' });
        }

        const cardW = Math.max(0, maxX - minX);
        const cardH = Math.max(0, maxY - minY);

        if (cardW < width * 0.2 || cardH < height * 0.16) {
          return resolve({ ok: false, guidance: 'Move ID closer to the camera.', debug: `small contour w=${cardW} h=${cardH}` });
        }

        const ratio = cardW / Math.max(1, cardH);
        const contourLooksLikeCard = ratio >= 0.8 && ratio <= 2.8;

        const q = await assessImageQuality(imageSrc);
        const dark = q.isDark || q.brightness < 50;
        if (dark) {
          return resolve({ ok: false, guidance: 'Unable to detect ID clearly. Please adjust lighting or position.', debug: `dark brightness=${q.brightness}` });
        }
        if (q.isBlurry && textLikeDensity < 0.045) {
          return resolve({ ok: false, guidance: 'Hold ID steady...', debug: `blur textDensity=${textLikeDensity.toFixed(3)}` });
        }

        // Fast "any-signal" acceptance.
        const fallbackTextSignal = textLikeDensity > 0.045 || areaFraction > 0.14;
        const ocrKeywordSignal = textLikeDensity > 0.07;
        const ok = contourLooksLikeCard || fallbackTextSignal || ocrKeywordSignal;
        const areaScore = Math.min(1, (cardW * cardH) / Math.max(1, width * height * 0.3));
        const sharpScore = q.isBlurry ? 0.2 : 1;
        const brightScore = Math.max(0, Math.min(1, (q.brightness - 55) / 90));
        const ratioScore = contourLooksLikeCard ? 1 : 0.45;
        const textScore = Math.max(0, Math.min(1, textLikeDensity / 0.12));
        const score = areaScore * 0.28 + sharpScore * 0.22 + brightScore * 0.18 + ratioScore * 0.14 + textScore * 0.18;
        const debug = `contour=${contourLooksLikeCard ? 'yes' : 'no'} area=${(cardW * cardH)} ratio=${ratio.toFixed(2)} blur=${q.isBlurry ? 'yes' : 'no'} brightness=${q.brightness} stable=${stableFramesRef.current} textDensity=${textLikeDensity.toFixed(3)} score=${score.toFixed(3)} reason=${ok ? 'accepted' : 'rejected'}`;
        if (ok && (!bestFrameRef.current || score > bestFrameRef.current.score)) {
          bestFrameRef.current = { image: imageSrc, score };
        }
        resolve({ ok, guidance: ok ? 'Hold ID steady...' : 'Looking for ID card...', debug });
      };
      img.onerror = () => resolve({ ok: false, guidance: 'Looking for ID card...', debug: 'image load error' });
      img.src = imageSrc;
    });
  }, []);

  const detectAndCropIdPhotoWithMediaPipe = useCallback((idCardImageSrc: string) => {
    return new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const anyWindow = window as any;
          if (typeof anyWindow.FaceDetector !== 'function') {
            resolve(null);
            return;
          }

          const sourceCanvas = document.createElement('canvas');
          sourceCanvas.width = img.width;
          sourceCanvas.height = img.height;
          const sctx = sourceCanvas.getContext('2d');
          if (!sctx) return resolve(null);
          sctx.drawImage(img, 0, 0);

          const detector = new anyWindow.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
          const faces = await detector.detect(sourceCanvas);
          if (!faces?.length) return resolve(null);

          const cardCenterX = img.width / 2;
          const cardCenterY = img.height / 2;
          const sorted = [...faces]
            .filter((f: any) => f?.boundingBox)
            .sort((a: any, b: any) => {
              const ab = a.boundingBox;
              const bb = b.boundingBox;
              const acx = ab.x + ab.width / 2;
              const acy = ab.y + ab.height / 2;
              const bcx = bb.x + bb.width / 2;
              const bcy = bb.y + bb.height / 2;
              const ad = Math.hypot(acx - cardCenterX, acy - cardCenterY);
              const bd = Math.hypot(bcx - cardCenterX, bcy - cardCenterY);
              return ad - bd;
            });

          const face = sorted[0];
          if (!face?.boundingBox) return resolve(null);
          const box = face.boundingBox;

          const padX = box.width * 0.6;
          const padTop = box.height * 0.7;
          const padBottom = box.height * 1.15;
          let cropX = Math.max(0, Math.floor(box.x - padX));
          let cropY = Math.max(0, Math.floor(box.y - padTop));
          let cropW = Math.min(img.width - cropX, Math.ceil(box.width + padX * 2));
          let cropH = Math.min(img.height - cropY, Math.ceil(box.height + padTop + padBottom));
          if (cropW < 24 || cropH < 24) return resolve(null);

          const out = document.createElement('canvas');
          out.width = 640;
          out.height = 640;
          const octx = out.getContext('2d');
          if (!octx) return resolve(null);
          octx.imageSmoothingEnabled = true;
          octx.imageSmoothingQuality = 'high';
          octx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, out.width, out.height);
          resolve(out.toDataURL('image/jpeg', 0.95));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = idCardImageSrc;
    });
  }, []);

  const fallbackCropIdPhoto = useCallback((idCardImageSrc: string) => {
    return new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 640;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          // Generic ID portrait slot fallback: left-side crop with padding.
          const sx = Math.round(img.width * 0.03);
          const sy = Math.round(img.height * 0.16);
          const sw = Math.round(img.width * 0.38);
          const sh = Math.round(img.height * 0.74);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = idCardImageSrc;
    });
  }, []);

  const dataUrlToBlob = useCallback((dataUrl: string) => {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
    const bytes = atob(base64);
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
    return new Blob([array], { type: mime });
  }, []);

  const scanWithBackendOcr = useCallback(async (imageSrc: string) => {
    const formData = new FormData();
    formData.append('idImage', dataUrlToBlob(imageSrc), 'id-scan.jpg');
    const response = await api.post('/api/id-ocr/scan-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return String(response.data?.text || '');
  }, [dataUrlToBlob]);

  const requestCameraAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      stream.getTracks().forEach((track) => track.stop());
      setShowCamera(true);
    } catch (err) {
      console.error(err);
      toast.error("Camera permission was denied. Please allow access to continue.");
    }
  }, []);

  const handleUploadIdClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);


  // 1. This function takes the screenshot from the webcam
  const captureAndScan = useCallback(async (autoTriggered = false, forcedFrame?: string) => {
    const now = Date.now();
    if (lastCaptureAtRef.current && now - lastCaptureAtRef.current < 1300) {
      setLiveStatus('Looking for ID card...');
      return;
    }
    const imageSrc = forcedFrame || bestFrameRef.current?.image || captureCroppedFrame() || webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      if (!autoTriggered) {
        toast.error("Could not access camera feed.");
      }
      setLiveStatus('Looking for ID card...');
      return;
    }

    lastCaptureAtRef.current = now;
    setIsScanning(true);
    successDispatchRef.current = false;
    clearFrameAnalyzeInterval();
    setLiveStatus('Capturing...');
    setProgress(autoTriggered ? 'Auto-detecting ID...' : 'Starting OCR...');
    if (!autoTriggered) {
      toast.info("Reading ID... keep it steady!");
    }

    try {
      // Do not hard-block manual capture; validate after capture pipeline.
      if (!autoTriggered) {
        setProgress('Checking image quality...');
        const quality = await assessImageQuality(imageSrc);
        if (quality.isDark || quality.isBlurry) {
          console.debug("[IDScanner] Manual scan continuing despite precheck", quality);
        }
      }

      const idCardCrop = await cropIdCardRegion(imageSrc);
      let idCardImage = idCardCrop.image;
      if (!idCardCrop.detected) {
        if (autoTriggered) {
          setLiveStatus('Looking for ID card...');
          return;
        }
        // Manual/upload fallback: continue with original frame.
        console.debug("[IDScanner] Card contour not found, continuing with original image");
        idCardImage = imageSrc;
      }

      setLiveStatus('Processing ID...');
      setProgress('Detecting ID photo...');
      let croppedIdPhoto = await detectAndCropIdPhotoWithMediaPipe(idCardImage);
      if (!croppedIdPhoto && !autoTriggered) {
        croppedIdPhoto = await fallbackCropIdPhoto(idCardImage);
      }
      if (!croppedIdPhoto) {
        if (!autoTriggered) {
          toast.error("Unable to detect ID photo clearly. Please retake the scan.");
        }
        setLiveStatus('Looking for ID card...');
        return;
      }
      if (await isBlurryDataUrl(croppedIdPhoto)) {
        if (autoTriggered) {
          setLiveStatus('Looking for ID card...');
          return;
        }
        // Manual/upload fallback: keep going if OCR is readable.
        console.debug("[IDScanner] Face crop blurry, continuing for manual/upload");
      }

      setProgress('Reading ID text...');
      const processedImages = await preprocessImage(idCardImage);
      let bestText = '';
      let bestKeywordScore = 0;

      for (let index = 0; index < processedImages.length; index += 1) {
        const processedImageSrc = processedImages[index];
        setProgress(`Reading ID (${index + 1}/${processedImages.length})...`);
        const rawText = await scanWithBackendOcr(processedImageSrc);
        
        // Apply OCR text cleanup to fix common character misrecognitions
        const text = cleanupOcrText(rawText);

        if (text.length > bestText.length) {
          bestText = text;
        }

        const normalized = text.replace(/\s+/g, ' ').trim().toUpperCase();
        const idHints = [
          'REPUBLIC OF THE PHILIPPINES', 'PHILIPPINE IDENTIFICATION', 'DRIVER', 'LICENSE',
          'UMID', 'POSTAL', 'PASSPORT', 'PHILSYS', 'PWD', 'SENIOR', 'OSCA', 'DATE OF BIRTH',
          'ADDRESS', 'SEX', 'FIRST NAME', 'LAST NAME'
        ];
        const score = idHints.filter((k) => normalized.includes(k)).length;
        if (score > bestKeywordScore) {
          bestKeywordScore = score;
          bestText = text;
        }

        if (looksLikeValidIdText(text) || score >= 1) {
          bestText = text;
          break;
        }
      }

      console.log("=== OCR OUTPUT (CLEANED) ===");
      console.log(bestText);
      console.log("==============================");

      const normalizedText = bestText.replace(/\s+/g, ' ').trim();
      if (!looksLikeValidIdText(normalizedText) && bestKeywordScore < 1 && normalizedText.length < 24) {
        if (autoTriggered) {
          setLiveStatus('Looking for ID card...');
          return;
        }
        toast.error("Unable to read ID clearly. Please retake the photo.");
        setLiveStatus('Looking for ID card...');
        return;
      }

      if (
        autoTriggered &&
        normalizedText &&
        normalizedText === lastSuccessfulTextRef.current
      ) {
        setLiveStatus('Looking for ID card...');
        return;
      }

      lastSuccessfulTextRef.current = normalizedText;
      console.debug("[IDScanner] OCR result received", { length: bestText.length });
      console.debug("[IDScanner] Face crop received", { hasPhoto: !!croppedIdPhoto });
      console.debug("[IDScanner] Validation passed");
      console.debug("[IDScanner] Applying to form");
      if (!successDispatchRef.current) {
        successDispatchRef.current = true;
        if (onScanSuccess) {
          onScanSuccess({
            ocrData: bestText,
            croppedPhoto: croppedIdPhoto,
            confidence: Math.min(100, Math.max(0, Math.round((bestText.length / 120) * 100))),
            detectedIdType: detectIdTypeQuick(bestText),
          });
        } else {
          onImageCaptured?.(croppedIdPhoto);
          onDataExtracted(bestText);
        }
      }
      toast.success(autoTriggered ? "ID detected and autofilled!" : "Scan complete!");
      setShowCamera(false);
      setLiveStatus('Looking for ID card...');
      bestFrameRef.current = null;
      console.debug("[IDScanner] Scanner stopped");
    } catch (err) {
      console.error(err);
      if (!autoTriggered) {
        const msg = (err as any)?.response?.data?.error || "Failed to read ID.";
        toast.error(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
        setProgress('');
        if (showCamera) {
          setLiveStatus('Looking for ID card...');
        }
      }
    }
  }, [webcamRef, onDataExtracted, onImageCaptured, onScanSuccess, preprocessImage, looksLikeValidIdText, captureCroppedFrame, scanWithBackendOcr, cropIdCardRegion, detectAndCropIdPhotoWithMediaPipe, fallbackCropIdPhoto, isBlurryDataUrl, clearFrameAnalyzeInterval, detectIdTypeQuick, showCamera]);

  const handleUploadIdFile = useCallback(async (file: File) => {
    if (!file) return;
    const okType = /image\/(jpeg|jpg|png)/i.test(file.type) || /\.(jpg|jpeg|png)$/i.test(file.name);
    if (!okType) {
      toast.error("Unable to read uploaded ID clearly. Please try another image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl.startsWith("data:image")) {
        toast.error("Unable to read uploaded ID clearly. Please try another image.");
        return;
      }
      try {
        await captureAndScan(false, dataUrl);
      } catch {
        toast.error("Unable to read uploaded ID clearly. Please try another image.");
      }
    };
    reader.onerror = () => toast.error("Unable to read uploaded ID clearly. Please try another image.");
    reader.readAsDataURL(file);
  }, [captureAndScan]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAutoScanTimeout();
      clearFrameAnalyzeInterval();
    };
  }, [clearAutoScanTimeout, clearFrameAnalyzeInterval]);

  useEffect(() => {
    if (!showCamera || isScanning) {
      clearFrameAnalyzeInterval();
      return;
    }

    setLiveStatus('Looking for ID card...');
    bestFrameRef.current = null;
    noAutoDetectSinceRef.current = Date.now();
    frameAnalyzeIntervalRef.current = setInterval(async () => {
      if (isScanning) return;
      const frame = captureCroppedFrame() || webcamRef.current?.getScreenshot();
      if (!frame) return;

      analyzeFrameCountRef.current += 1;
      const card = await detectCardInFrame(frame);
      console.debug('[IDScannerDetect]', card.debug);
      setLiveStatus(card.ok ? 'ID detected. Capturing...' : card.guidance);

      if (!card.ok) {
        stableFramesRef.current = 0;
        const now = Date.now();
        // Fallback: if ID appears in frame but strict detection misses, still attempt capture quickly.
        if (now - lastAutoFallbackAttemptRef.current > 1200) {
          lastAutoFallbackAttemptRef.current = now;
          setLiveStatus('ID detected. Capturing...');
          await captureAndScan(true, bestFrameRef.current?.image || frame);
          return;
        }
        if (noAutoDetectSinceRef.current && Date.now() - noAutoDetectSinceRef.current > 7000) {
          setLiveStatus('ID is visible but automatic detection failed. Please tap Scan to capture manually.');
        }
        if (
          card.guidance.includes('Unable to detect ID clearly') &&
          now - lastGuidanceToastRef.current > 4500
        ) {
          lastGuidanceToastRef.current = now;
          toast.error('Unable to detect ID clearly. Please adjust lighting or position.');
        }
        return;
      }

      stableFramesRef.current += 1;
      if (!noAutoDetectSinceRef.current) noAutoDetectSinceRef.current = Date.now();
      if (stableFramesRef.current >= 1) {
        setLiveStatus('ID detected. Capturing...');
        stableFramesRef.current = 0;
        noAutoDetectSinceRef.current = null;
        await captureAndScan(true, bestFrameRef.current?.image);
      }
    }, 180);

    return clearFrameAnalyzeInterval;
  }, [showCamera, isScanning, captureAndScan, captureCroppedFrame, detectCardInFrame, clearFrameAnalyzeInterval]);


  return (
    <div className="inline-flex max-w-full flex-col items-center gap-4 px-6 py-4 border-2 border-dashed border-[#2957a1] rounded-xl bg-blue-50/50">
      {!showCamera ? (
        <div className="w-full flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={requestCameraAccess}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2957a1] text-white rounded-lg font-bold shadow-md hover:bg-[#1e3f7a] transition-all"
          >
            <Camera className="w-5 h-5" />
            ACTIVATE CAMERA SCANNER
          </button>
          <button
            type="button"
            onClick={handleUploadIdClick}
            disabled={isScanning}
            className="flex-1 py-3 rounded-lg font-semibold border border-[#2957a1] text-[#2957a1] bg-white hover:bg-blue-50 disabled:opacity-60"
          >
            Upload ID
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.currentTarget.value = '';
              if (file) handleUploadIdFile(file);
            }}
          />
        </div>
      ) : (
        <div className="relative w-full max-w-2xl flex flex-col items-center">
          {/* LIVE WEBCAM BOX */}
          <div className="relative rounded-lg overflow-hidden border-4 border-white shadow-xl bg-black w-full aspect-[1.65/1]">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={1}
              className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
              videoConstraints={{
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }}
            />
            <button
              type="button"
              onClick={() => setIsMirrored((v) => !v)}
              className="absolute top-2 right-2 z-20 px-3 py-1.5 rounded-md bg-white/90 text-[#2957a1] text-xs font-semibold shadow hover:bg-white"
            >
              <span className="inline-flex items-center gap-1">
                <FlipHorizontal className="w-3.5 h-3.5" />
                {isMirrored ? 'Flip Off' : 'Flip On'}
              </span>
            </button>
            {isScanning && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                <Loader2 className="w-10 h-10 animate-spin mb-2" />
                <p className="font-bold">{progress}</p>
              </div>
            )}
            {!isScanning && (
              <div className="absolute bottom-2 left-2 right-2 z-20 rounded-md bg-black/60 px-3 py-2 text-center text-xs font-semibold text-white">
                {liveStatus}
              </div>
            )}
          </div>


          {/* ACTION BUTTONS */}
          <div className="flex gap-2 mt-4 w-full">
            <button
              type="button"
              onClick={() => setShowCamera(false)}
              className="flex items-center justify-center p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
           
            <button
              type="button"
              onClick={() => {
                setLiveStatus('ID detected. Capturing...');
                captureAndScan(false, bestFrameRef.current?.image || captureCroppedFrame() || undefined);
              }}
              disabled={isScanning}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#5CE36C] text-white rounded-lg font-bold hover:bg-[#4bc95b] shadow-lg disabled:bg-gray-400"
            >
              <Zap className="w-5 h-5" />
              {isScanning ? 'SCANNING...' : 'SCAN NOW'}
            </button>
          </div>
          <div className="mt-2 w-full">
            <button
              type="button"
              onClick={handleUploadIdClick}
              disabled={isScanning}
              className="w-full py-2.5 rounded-lg font-semibold border border-[#2957a1] text-[#2957a1] bg-white hover:bg-blue-50 disabled:opacity-60"
            >
              Upload ID
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = '';
                if (file) handleUploadIdFile(file);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
