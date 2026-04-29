/**
 * OCR Text Cleanup and Quality Detection Utilities
 * Handles character substitution, noise removal, and image quality assessment
 */

/**
 * Common OCR character misrecognitions and their corrections
 * Converts: 0↔O, 1↔I, 5↔S, etc.
 */
export const cleanupOcrText = (text: string): string => {
  if (!text) return '';
  
  let cleaned = text;
  
  // Character substitution rules based on context
  // These rules are applied carefully to avoid over-correction
  
  // 0 ↔ O: Replace O with 0 in ID numbers, replace 0 with O in names
  cleaned = cleaned.replace(/\bO(\d)/g, '0$1'); // O followed by digit → 0
  cleaned = cleaned.replace(/(\D)0([A-Z]{2})/g, '$1O$2'); // 0 followed by letters → O
  
  // 1 ↔ I: Replace 1 with I in names, I with 1 in ID numbers
  cleaned = cleaned.replace(/\bI(\d)/g, '1$1'); // I followed by digit → 1
  cleaned = cleaned.replace(/(\D)1([A-Z])/g, '$1I$2'); // 1 followed by letter → I
  
  // 5 ↔ S: Replace 5 with S in names, S with 5 in some contexts
  cleaned = cleaned.replace(/\b5([A-Z])/g, 'S$1'); // 5 at word start before letter → S
  cleaned = cleaned.replace(/([A-Z])5([A-Z])/g, '$1S$2'); // 5 between letters → S
  
  // Common OCR artifacts and noise removal
  // Remove common symbols that appear at edges or due to OCR errors
  cleaned = cleaned.replace(/[|!](?=[A-Z])/g, ''); // | or ! before letters
  cleaned = cleaned.replace(/(?<=[A-Z])[|!]/g, ''); // | or ! after letters
  
  // Remove random dashes or underscores in text fields
  cleaned = cleaned.replace(/(?<=[A-Z])\-{2,}(?=[A-Z])/g, ' ');
  cleaned = cleaned.replace(/_{2,}/g, ' ');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  
  return cleaned;
};

/**
 * Detect if OCR text has low confidence indicators
 */
export const hasLowOcrConfidence = (text: string): boolean => {
  if (!text || text.length < 20) return true;
  
  // Count suspicious patterns that indicate OCR failure
  const suspiciousPatterns = [
    /[|!]{2,}/g,  // Multiple vertical bars
    /[0O]{3,}/g,   // Too many Os/zeros in sequence
    /[1I]{3,}/g,   // Too many Is/ones in sequence
    /[~^`]{2,}/g,  // Multiple special characters
    /(?:[^A-Z0-9\s]){4,}/g, // Long sequences of special chars
  ];
  
  let suspiciousCount = 0;
  for (const pattern of suspiciousPatterns) {
    const matches = text.match(pattern);
    suspiciousCount += matches ? matches.length : 0;
  }
  
  // If more than 3 suspicious patterns found, confidence is low
  return suspiciousCount > 3;
};

/**
 * Detect image quality issues: blurriness and darkness
 * Returns a quality assessment
 */
export const assessImageQuality = (imageDataUrl: string): Promise<{
  isBlurry: boolean;
  isDark: boolean;
  brightness: number;
  confidence: 'low' | 'medium' | 'high';
}> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({ isBlurry: false, isDark: false, brightness: 0, confidence: 'medium' });
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate average brightness
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
      }
      const avgBrightness = totalBrightness / (data.length / 4);
      
      // Detect darkness: average brightness < 80 is very dark
      const isDark = avgBrightness < 80;
      
      // Detect blur using edge detection (Laplacian)
      const blurDetection = detectBlur(imageData, canvas.width, canvas.height);
      
      const confidence = isDark ? 'low' : (blurDetection > 100 ? 'high' : 'medium');
      
      resolve({
        isBlurry: blurDetection < 100,
        isDark,
        brightness: Math.round(avgBrightness),
        confidence,
      });
    };
    img.onerror = () => {
      resolve({ isBlurry: false, isDark: false, brightness: 0, confidence: 'medium' });
    };
    img.src = imageDataUrl;
  });
};

/**
 * Simple blur detection using edge strength analysis
 * Higher values = sharper image, lower values = blurrier
 */
const detectBlur = (imageData: ImageData, width: number, height: number): number => {
  const data = imageData.data;
  let edgeStrength = 0;
  let edgeCount = 0;
  
  // Sample pixels to calculate edge strength (Laplacian)
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      const neighbors = [
        (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3,
        (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3,
        (data[(y * width + (x - 1)) * 4] + data[(y * width + (x - 1)) * 4 + 1] + data[(y * width + (x - 1)) * 4 + 2]) / 3,
        (data[(y * width + (x + 1)) * 4] + data[(y * width + (x + 1)) * 4 + 1] + data[(y * width + (x + 1)) * 4 + 2]) / 3,
      ];
      
      const laplacian = Math.abs(4 * center - neighbors.reduce((a, b) => a + b, 0));
      edgeStrength += laplacian;
      edgeCount++;
    }
  }
  
  return edgeCount > 0 ? Math.round(edgeStrength / edgeCount) : 0;
};
