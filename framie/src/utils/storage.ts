const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const BUCKET = "photo-results";

export function getStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function loadImage(src: string, crossOrigin = false) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    img.src = src;
  });
}
