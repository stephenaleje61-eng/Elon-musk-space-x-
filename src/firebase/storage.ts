export interface UploadProgressCallback {
  (progress: number, status: string): void;
}

const MAX_FIRESTORE_MEDIA_LEN = 650 * 1024;

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

export const fileToDataUrl = (file: File): Promise<string> => blobToDataUrl(file);

/**
 * Fast client-side image compression utility.
 * Resizes large photos and compresses to JPEG safely under Firestore 1 MiB limits
 * while preserving high visual clarity and zero CORS/network failures.
 */
export function compressImageFile(
  file: File,
  maxDimension = 1080,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const MAX_DATA_URL_LEN = 420 * 1024;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let q = quality;
        while (dataUrl.length > MAX_DATA_URL_LEN && q > 0.35) {
          q -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.35, q));
        }

        if (dataUrl.length > MAX_DATA_URL_LEN) {
          const scale = 0.65;
          canvas.width = Math.max(320, Math.round(width * scale));
          canvas.height = Math.max(240, Math.round(height * scale));
          const ctx2 = canvas.getContext('2d');
          if (ctx2) {
            ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          }
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = src;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes a picture attachment into a persistent compressed JPEG payload
 * ready for immediate Firestore delivery without Storage CORS delays.
 */
export async function uploadImage(
  file: File,
  _path: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (onProgress) onProgress(40, 'Optimizing picture...');
  const compressed = await compressImageFile(file, 1080, 0.82);
  if (compressed.length > MAX_FIRESTORE_MEDIA_LEN) {
    throw new Error('Image exceeds maximum supported size even after compression.');
  }
  if (onProgress) onProgress(100, 'Ready');
  return compressed;
}

/**
 * Converts a recorded voice message blob into a persistent audio payload
 * validated under Firestore limits for immediate delivery.
 */
export async function uploadAudioBlob(
  blob: Blob,
  _path: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (onProgress) onProgress(50, 'Encoding voice note...');
  const dataUrl = await blobToDataUrl(blob);
  if (dataUrl.length > MAX_FIRESTORE_MEDIA_LEN) {
    throw new Error('Voice message is too long. Please keep recordings under 40 seconds.');
  }
  if (onProgress) onProgress(100, 'Ready');
  return dataUrl;
}
