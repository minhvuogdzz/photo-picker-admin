/**
 * Tiện ích nén ảnh siêu tốc phía Client (Admin Panel)
 * - Tối ưu tỷ lệ chuẩn Full HD (Max dimension 1920px) cho Slider màn hình sắc nét.
 * - Giảm dung lượng file từ hàng chục MB xuống ~150KB - 350KB/ảnh mà vẫn giữ độ nét cao.
 * - Nén song song nhiều ảnh cùng lúc, xử lý xong toàn bộ danh sách chỉ trong 1-2 giây.
 */

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
  previewUrl: string;
}

const MAX_DIMENSION = 1920; // Chuẩn Full HD cho màn hình app/desktop
const JPEG_QUALITY = 0.82; // Chất lượng xuất sắc, mắt thường không thấy giảm chất lượng

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Không thể xuất dữ liệu ảnh nén.'));
        }
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Nén 1 ảnh siêu tốc bằng Canvas với kích thước chuẩn 1920px
 */
export async function compressImageForShowcase(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  if (!file.type.startsWith('image/')) {
    throw new Error(`File "${file.name}" không phải là định dạng hình ảnh hợp lệ.`);
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

        // Tính tỷ lệ thu nhỏ nếu vượt quá 1920px
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          throw new Error('Canvas 2D context không khả dụng.');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const blob = await canvasToJpeg(canvas, JPEG_QUALITY);

        // Tạo File JPEG mới
        const newName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        const compressedFile = new File([blob], newName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        const previewUrl = URL.createObjectURL(compressedFile);

        resolve({
          file: compressedFile,
          originalSize,
          compressedSize: compressedFile.size,
          wasCompressed: compressedFile.size < originalSize,
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
 * Nén song song danh sách ảnh với concurrency để đạt tốc độ tối đa
 */
export async function compressShowcaseBatch(
  files: File[],
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<CompressionResult[]> {
  const total = files.length;
  let completed = 0;

  // Xử lý song song tối đa 4 ảnh cùng lúc
  const concurrency = 4;
  const results: CompressionResult[] = new Array(total);

  let currentIndex = 0;

  const runWorker = async () => {
    while (currentIndex < total) {
      const idx = currentIndex++;
      const file = files[idx];
      const res = await compressImageForShowcase(file);
      results[idx] = res;
      completed++;
      if (onProgress) {
        onProgress(completed, total, file.name);
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => runWorker());
  await Promise.all(workers);

  return results;
}

/**
 * Format dung lượng file dạng byte -> MB/KB dễ đọc
 */
export function formatFileSizeMB(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(0) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
