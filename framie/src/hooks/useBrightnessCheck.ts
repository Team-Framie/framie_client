import { useEffect, useRef, useState, type RefObject } from "react";

export type BrightnessStatus = "ok" | "too_bright" | "too_dark" | "unknown";

const SAMPLE_INTERVAL_MS = 800;
const SAMPLE_WIDTH = 80;
const SAMPLE_HEIGHT = 45;
const EDGE_RATIO = 0.2; // 사람이 있을 확률 높은 중앙 60%는 제외하고 배경만 평가
const DEBOUNCE_COUNT = 2; // 1.6초 유지되면 경고

// 자동 노출 카메라는 평균 밝기를 항상 중간으로 보정하려 한다.
// → 평균이 아니라 "복구 불가능한 클리핑 픽셀 비율"로 판단해야 실제로 걸린다.
const BRIGHT_CLIP = 235; // Y >= 235 는 사실상 하얗게 날아간 영역
const DARK_CLIP = 25;    // Y <= 25  는 사실상 까맣게 뭉개진 영역
const BRIGHT_RATIO_THRESHOLD = 0.18; // 외곽의 18% 이상이 overexposed면 too_bright
const DARK_RATIO_THRESHOLD = 0.28;   // 외곽의 28% 이상이 underexposed면 too_dark (그림자는 흔함)
// 평균 밝기 보조 판정 (자동노출이 회복 못 할 정도로 극단)
const AVG_BRIGHT = 185;
const AVG_DARK = 65;

export default function useBrightnessCheck(
  videoRef: RefObject<HTMLVideoElement | null>,
  paused: boolean,
): BrightnessStatus {
  const [status, setStatus] = useState<BrightnessStatus>("unknown");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<BrightnessStatus[]>([]);

  useEffect(() => {
    if (paused) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = SAMPLE_WIDTH;
      canvasRef.current.height = SAMPLE_HEIGHT;
    }

    const sample = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
      } catch {
        return;
      }

      const edgeX = Math.floor(SAMPLE_WIDTH * EDGE_RATIO);
      const edgeY = Math.floor(SAMPLE_HEIGHT * EDGE_RATIO);

      let sum = 0;
      let count = 0;
      let brightClipped = 0;
      let darkClipped = 0;

      for (let y = 0; y < SAMPLE_HEIGHT; y += 1) {
        for (let x = 0; x < SAMPLE_WIDTH; x += 1) {
          const isEdge =
            x < edgeX ||
            x >= SAMPLE_WIDTH - edgeX ||
            y < edgeY ||
            y >= SAMPLE_HEIGHT - edgeY;
          if (!isEdge) continue;
          const idx = (y * SAMPLE_WIDTH + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          sum += lum;
          count += 1;
          if (lum >= BRIGHT_CLIP) brightClipped += 1;
          else if (lum <= DARK_CLIP) darkClipped += 1;
        }
      }

      if (count === 0) return;
      const avg = sum / count;
      const brightRatio = brightClipped / count;
      const darkRatio = darkClipped / count;

      let next: BrightnessStatus = "ok";
      if (brightRatio >= BRIGHT_RATIO_THRESHOLD || avg >= AVG_BRIGHT) {
        next = "too_bright";
      } else if (darkRatio >= DARK_RATIO_THRESHOLD || avg <= AVG_DARK) {
        next = "too_dark";
      }

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[brightness]", {
          avg: avg.toFixed(1),
          brightRatio: (brightRatio * 100).toFixed(1) + "%",
          darkRatio: (darkRatio * 100).toFixed(1) + "%",
          status: next,
        });
      }

      const history = historyRef.current;
      history.push(next);
      if (history.length > DEBOUNCE_COUNT) history.shift();

      if (history.length === DEBOUNCE_COUNT && history.every((s) => s === next)) {
        setStatus((prev) => (prev === next ? prev : next));
      }
    };

    const id = window.setInterval(sample, SAMPLE_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [videoRef, paused]);

  return status;
}
