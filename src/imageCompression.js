export const FULL_IMAGE_EDGE = 1600;
export const THUMBNAIL_EDGE = 480;

export function fitImage(width, height, edge) {
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// Encode locally: the Free Supabase plan does not include image transformations.
export async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('画像を読み込めません。別の画像を選んでください。'));
      image.src = url;
    });
    const encode = async (edge, quality) => {
      const canvas = document.createElement('canvas');
      Object.assign(canvas, fitImage(image.naturalWidth, image.naturalHeight, edge));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('画像を圧縮できません。');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob) throw new Error('画像を圧縮できません。');
        return blob;
      } finally { canvas.width = canvas.height = 1; }
    };
    // Preserve animated GIFs; their thumbnail is a still preview.
    const candidate = file.type === 'image/gif' ? file : await encode(FULL_IMAGE_EDGE, 0.82);
    const full = candidate.size < file.size ? candidate : file;
    const thumbnail = await encode(THUMBNAIL_EDGE, 0.75);
    return { full, thumbnail: thumbnail.size < full.size ? thumbnail : full };
  } finally { URL.revokeObjectURL(url); }
}
