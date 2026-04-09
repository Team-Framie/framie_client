import { loadImage } from "./storage";

export async function compositeOverlay(
  userPhotoBlob: Blob,
  overlayUrl: string,
  side: "left" | "right" = "left"
): Promise<Blob> {
  const userUrl = URL.createObjectURL(userPhotoBlob);
  try {
    const [userImg, overlayImg] = await Promise.all([
      loadImage(userUrl, false),
      loadImage(overlayUrl, true),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = userImg.naturalWidth;
    canvas.height = userImg.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 만들 수 없어요.");
    ctx.drawImage(userImg, 0, 0);
    const scale = canvas.height / overlayImg.naturalHeight;
    const ow = overlayImg.naturalWidth * scale;
    const oh = canvas.height;
    const ox = side === "left" ? 0 : canvas.width - ow;
    ctx.drawImage(overlayImg, ox, 0, ow, oh);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("합성 결과를 만들 수 없어요."))),
        "image/png"
      );
    });
  } finally {
    URL.revokeObjectURL(userUrl);
  }
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("이미지 변환에 실패했어요."));
      }
    };
    reader.onerror = () => reject(new Error("이미지 변환에 실패했어요."));
    reader.readAsDataURL(blob);
  });
}

export function captureVideoFrame(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("카메라 캡처를 처리할 수 없어요.");

  context.save();
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, width, height);
  context.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("사진 캡처에 실패했어요."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
