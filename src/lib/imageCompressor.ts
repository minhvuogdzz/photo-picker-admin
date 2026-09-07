/**
 * Tiện ích nén ảnh tự động phía Client (Admin Panel)
 * Cho phép người dùng tải lên ảnh gốc không giới hạn dung lượng ở tầng giao diện.
 * Hệ thống sẽ tự động nén xuống dưới 1.5MB/file trước khi gửi lên Cloudinary.
 */

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
  previewUrl: string;
}

const MAX_TARGET_BYTES = Math.floor(1.45 * 1024 * 1024);
const MAX_DIMENSION_INITIAL = 3840;
const MIN_DIMENSION = 320;
const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Không thể xuất file ảnh đã nén.'));
      }
    }, 'image/jpeg', quality);
  });
}

/**
 * Nén một ảnh xuống dưới 1.5MB bằng Canvas. Ảnh lớn được giảm chất lượng
 * và kích thước theo từng vòng cho đến khi đạt giới hạn đầu ra.
 */
export async function compressImageForShowcase(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  if (!file.type.startsWith('image/')) {
    throw new Error(`File \"${file.name}\" không phải là hình ảnh hợp lệ.`);
  }

  if (originalSize <= MAX_TARGET_BYTES) {
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      previewUrl,
    };
  }

  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error(`Không thể giải mã hình ảnh "${file.name}".`));
    };
    img.onload = async () => {
        try {
          let { width, height } = img;

          // Thu nhỏ tỷ lệ nếu ảnh vượt quá 4K (3840px)
          if (width > MAX_DIMENSION_INITIAL || height > MAX_DIMENSION_INITIAL) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION_INITIAL) / width);
              width = MAX_DIMENSION_INITIAL;
            } else {
              width = Math.round((width * MAX_DIMENSION_INITIAL) / height);
              height = MAX_DIMENSION_INITIAL;
            }
          }

          const canvas = document.createElement('canvas');
          let chosenBlob: Blob | null = null;

          for (let resizeAttempt = 0; resizeAttempt < 10; resizeAttempt += 1) {
            canvas.width = Math.max(1, Math.round(width));
            canvas.height = Math.max(1, Math.round(height));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Canvas 2D context không khả dụng.');
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            for (const quality of QUALITY_STEPS) {
              chosenBlob = await canvasToJpeg(canvas, quality);
              if (chosenBlob.size <= MAX_TARGET_BYTES) break;
            }

            if (!chosenBlob) {
              throw new Error('Không thể tạo dữ liệu ảnh sau khi nén.');
            }
            if (chosenBlob.size <= MAX_TARGET_BYTES) break;

            const sizeRatio = Math.sqrt(MAX_TARGET_BYTES / chosenBlob.size);
            const scale = Math.min(0.85, Math.max(0.5, sizeRatio * 0.92));
            const currentMaxDimension = Math.max(width, height);
            const nextMaxDimension = Math.max(
              MIN_DIMENSION,
              Math.round(currentMaxDimension * scale),
            );
            const dimensionScale = nextMaxDimension / currentMaxDimension;
            const nextWidth = Math.max(1, Math.round(width * dimensionScale));
            const nextHeight = Math.max(1, Math.round(height * dimensionScale));

            if (nextWidth === width && nextHeight === height) break;
            width = nextWidth;
            height = nextHeight;
          }

          if (!chosenBlob || chosenBlob.size > MAX_TARGET_BYTES) {
            throw new Error(`Không thể nén file \"${file.name}\" xuống dưới 1.5MB.`);
          }

          // Tạo File mới với đuôi .jpg
          const newName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const compressedFile = new File([chosenBlob], newName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          const previewUrl = URL.createObjectURL(compressedFile);

          resolve({
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size,
            wasCompressed: true,
            previewUrl,
          });
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(sourceUrl);
        }
    };

    img.src = sourceUrl;
  });
}

/**
 * Nén tuần tự danh sách ảnh (tối đa 20 ảnh) để tránh tăng vọt bộ nhớ.
 */
export async function compressShowcaseBatch(
  files: File[],
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i + 1, total, file.name);
    }
    const res = await compressImageForShowcase(file);
    results.push(res);
  }

  return results;
}

/**
 * Format dung lượng file dạng byte -> MB dễ đọc
 */
export function formatFileSizeMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
