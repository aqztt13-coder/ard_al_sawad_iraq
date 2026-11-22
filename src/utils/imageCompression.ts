export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxInputBytes?: number;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const DEFAULT_MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB

export function validateImageFile(
  file: File,
  maxInputBytes: number = DEFAULT_MAX_INPUT_BYTES
): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    return 'صيغة الصورة غير مدعومة. يُرجى اختيار صورة بصيغة JPG أو PNG أو WebP.';
  }
  if (file.size > maxInputBytes) {
    return 'حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 15 ميغابايت.';
  }
  return null;
}

/**
 * Compresses and resizes an image file on the client side using an offscreen
 * HTML5 canvas before uploading to Supabase Storage. Also strips EXIF metadata.
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    maxInputBytes = DEFAULT_MAX_INPUT_BYTES,
  } = options;

  const validationError = validateImageFile(file, maxInputBytes);
  if (validationError) {
    throw new Error(validationError);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(new Error('تعذر قراءة ملف الصورة. يُرجى تجربة صورة أخرى.'));
      el.src = objectUrl;
    });

    let targetWidth = img.naturalWidth || img.width;
    let targetHeight = img.naturalHeight || img.height;

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
      targetWidth = Math.max(1, Math.round(targetWidth * ratio));
      targetHeight = Math.max(1, Math.round(targetHeight * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }

    // Fill with warm neutral backdrop in case PNG has transparency
    ctx.fillStyle = '#18292D';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
    });

    if (!blob) {
      return file;
    }

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
