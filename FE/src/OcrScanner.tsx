import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { Camera, X, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';


interface OcrScannerProps {
  onDataExtracted: (text: string) => void;
}


export default function OcrScanner({ onDataExtracted }: OcrScannerProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState('');
  const webcamRef = useRef<Webcam>(null);
  const autoScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuccessfulTextRef = useRef('');
  const isMountedRef = useRef(true);

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


  // 1. This function takes the screenshot from the webcam
  const captureAndScan = useCallback(async (autoTriggered = false) => {
    const imageSrc = captureCroppedFrame() || webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      if (!autoTriggered) {
        toast.error("Could not access camera feed.");
      }
      return;
    }


    setIsScanning(true);
    setProgress(autoTriggered ? 'Auto-detecting ID...' : 'Starting OCR...');
    if (!autoTriggered) {
      toast.info("Reading ID... keep it steady!");
    }


    try {
      const processedImages = await preprocessImage(imageSrc);
      let bestText = '';

      for (let index = 0; index < processedImages.length; index += 1) {
        const processedImageSrc = processedImages[index];
        const { data: { text } } = await Tesseract.recognize(
          processedImageSrc,
          'eng',
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                setProgress(`Scanning: ${Math.round(m.progress * 100)}%`);
              }
            },
            tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
            preserve_interword_spaces: '1',
          }
        );

        if (text.length > bestText.length) {
          bestText = text;
        }

        if (looksLikeValidIdText(text)) {
          bestText = text;
          break;
        }
      }

      console.log("=== OCR OUTPUT ===");
      console.log(bestText);
      console.log("==================");


      const normalizedText = bestText.replace(/\s+/g, ' ').trim();
      if (!looksLikeValidIdText(normalizedText)) {
        if (autoTriggered) {
          return;
        }
        toast.error("No valid ID text detected. Try improving the lighting and framing.");
        return;
      }

      if (
        autoTriggered &&
        normalizedText &&
        normalizedText === lastSuccessfulTextRef.current
      ) {
        return;
      }

      lastSuccessfulTextRef.current = normalizedText;
      onDataExtracted(bestText);
      toast.success(autoTriggered ? "ID detected and autofilled!" : "Scan complete!");
      setShowCamera(false);
    } catch (err) {
      console.error(err);
      if (!autoTriggered) {
        toast.error("Failed to read ID.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
        setProgress('');
      }
    }
  }, [webcamRef, onDataExtracted, preprocessImage, looksLikeValidIdText, captureCroppedFrame]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAutoScanTimeout();
    };
  }, [clearAutoScanTimeout]);

  useEffect(() => {
    if (!showCamera) {
      clearAutoScanTimeout();
      return;
    }

    if (isScanning) {
      return;
    }

    autoScanTimeoutRef.current = setTimeout(() => {
      captureAndScan(true);
    }, 1800);

    return clearAutoScanTimeout;
  }, [showCamera, isScanning, captureAndScan, clearAutoScanTimeout]);


  return (
    <div className="inline-flex max-w-full flex-col items-center gap-4 px-6 py-4 border-2 border-dashed border-[#2957a1] rounded-xl bg-blue-50/50">
      {!showCamera ? (
        <button
          type="button"
          onClick={requestCameraAccess}
          className="flex items-center gap-2 px-6 py-3 bg-[#2957a1] text-white rounded-lg font-bold shadow-md hover:bg-[#1e3f7a] transition-all"
        >
          <Camera className="w-5 h-5" />
          ACTIVATE CAMERA SCANNER
        </button>
      ) : (
        <div className="relative w-full max-w-2xl flex flex-col items-center">
          {/* LIVE WEBCAM BOX */}
          <div className="relative rounded-lg overflow-hidden border-4 border-white shadow-xl bg-black w-full aspect-[1.65/1]">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={1}
              className="w-full h-full object-cover"
              videoConstraints={{
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }}
            />
            {isScanning && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                <Loader2 className="w-10 h-10 animate-spin mb-2" />
                <p className="font-bold">{progress}</p>
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
              onClick={() => captureAndScan(false)}
              disabled={isScanning}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#5CE36C] text-white rounded-lg font-bold hover:bg-[#4bc95b] shadow-lg disabled:bg-gray-400"
            >
              <Zap className="w-5 h-5" />
              {isScanning ? 'SCANNING...' : 'SCAN NOW'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
