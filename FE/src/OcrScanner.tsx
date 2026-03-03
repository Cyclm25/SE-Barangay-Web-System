import React, { useState, useRef, useCallback } from 'react';
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


  // 1. This function takes the screenshot from the webcam
  const captureAndScan = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error("Could not access camera feed.");
      return;
    }


    setIsScanning(true);
    setProgress('Starting OCR...');
    toast.info("Reading ID... keep it steady!");


    try {
      // 2. We use Tesseract here to read the image data
      const { data: { text } } = await Tesseract.recognize(
        imageSrc,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(`Scanning: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );


      console.log("=== OCR OUTPUT ===");
      console.log(text);
      console.log("==================");


      // 3. Send the found text back to the main form
      onDataExtracted(text);
      toast.success("Scan complete!");
      setShowCamera(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read ID.");
    } finally {
      setIsScanning(false);
      setProgress('');
    }
  }, [webcamRef, onDataExtracted]);


  return (
    <div className="w-full flex flex-col items-center gap-4 p-4 border-2 border-dashed border-[#2957a1] rounded-xl bg-blue-50/50">
      {!showCamera ? (
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#2957a1] text-white rounded-lg font-bold shadow-md hover:bg-[#1e3f7a] transition-all"
        >
          <Camera className="w-5 h-5" />
          ACTIVATE CAMERA SCANNER
        </button>
      ) : (
        <div className="relative w-full max-w-sm flex flex-col items-center">
          {/* LIVE WEBCAM BOX */}
          <div className="relative rounded-lg overflow-hidden border-4 border-white shadow-xl bg-black w-full aspect-video">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={{ facingMode: "environment" }}
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
              onClick={captureAndScan}
              disabled={isScanning}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#5CE36C] text-white rounded-lg font-bold hover:bg-[#4bc95b] shadow-lg disabled:bg-gray-400"
            >
              <Zap className="w-5 h-5" />
              {isScanning ? 'SCANNING...' : 'CAPTURE & AUTOFILL'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
