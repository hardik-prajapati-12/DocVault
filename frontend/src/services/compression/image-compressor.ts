export class ImageCompressor {
  static async compress(
    blob: Blob,
    options: { quality: number; resolutionScale?: number; colorMode?: 'color' | 'grayscale' }
  ): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        const scale = (options.resolutionScale ?? 100) / 100;
        const width = Math.max(1, img.width * scale);
        const height = Math.max(1, img.height * scale);
        canvas.width = width;
        canvas.height = height;

        // Draw image
        if (options.colorMode === 'grayscale') {
          ctx.drawImage(img, 0, 0, width, height);
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
            data[i] = brightness;
            data[i + 1] = brightness;
            data[i + 2] = brightness;
          }
          ctx.putImageData(imgData, 0, 0);
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }

        const quality = options.quality / 100;
        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob) {
              resolve({
                blob: compressedBlob,
                originalSize: blob.size,
                compressedSize: compressedBlob.size,
              });
            } else {
              reject(new Error('Canvas conversion to blob failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image for compression'));
      };
    });
  }
}
