import { useMemo, useState, useCallback } from "react";
import h1 from "../../assets/frame_photo.svg";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useCamera } from "../../hooks/useCamera";
import useBrightnessCheck from "../../hooks/useBrightnessCheck";
import { compositeOverlay, blobToDataUrl, captureVideoFrame } from "../../utils/canvas";
import BackButton from "../../components/BackButton";
import { PRIMARY_DARK as PRIMARY } from "../../styles/theme";
import type { ResultPayload } from "../../types/photos";

async function removeBackground(imageBlob: Blob) {
  return api.images.removeBg(imageBlob, AbortSignal.timeout(60000));
}

export default function TakePhoto() {
  const { videoRef, error, setError } = useCamera();
  const location = useLocation();
  const navigate = useNavigate();
  const frameId = location.state?.frameId || "";
  const shotCount = Number(location.state?.shotCount) || 2;
  const frameTitle = location.state?.frameTitle || `${shotCount}컷`;
  const rawRetakeIndex = location.state?.retakeIndex;
  const initialPhotos: string[] = Array.isArray(location.state?.photos) ? location.state.photos : [];
  const initialOriginals: string[] = Array.isArray(location.state?.originals) ? location.state.originals : [];
  const overlayPhotos: string[] = Array.isArray(location.state?.overlayPhotos) ? location.state.overlayPhotos : [];
  const sourceType: string | undefined = location.state?.sourceType;
  const frameOwnerId: string | undefined = location.state?.frameOwnerId;
  const isCustomShoot = sourceType === "other_frame";
  const isRetake =
    typeof rawRetakeIndex === "number" && rawRetakeIndex >= 0 && rawRetakeIndex < shotCount;
  const retakeIndex: number | null = isRetake ? rawRetakeIndex : null;
  const [currentShotIndex, setCurrentShotIndex] = useState(isRetake ? (retakeIndex as number) : 0);
  const [capturedImages, setCapturedImages] = useState<string[]>(isRetake ? initialPhotos : []);
  const [capturedOriginals, setCapturedOriginals] = useState<string[]>(isRetake ? initialOriginals : []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  // 커스텀 촬영은 rembg를 안 타므로 경고 불필요
  const brightness = useBrightnessCheck(videoRef, isCountingDown || isProcessing || isCustomShoot);

  const shotSlots = useMemo(() => Array.from({ length: shotCount }, (_, index) => index), [shotCount]);

  const handleCaptureShot = useCallback(async () => {
    if (isProcessing || isCountingDown) return;

    if (!frameId) {
      setError("프레임 ID 없이 촬영 중이에요. 저장하려면 프레임 선택 화면에서 다시 들어와 주세요.");
      return;
    }

    if (!videoRef.current) {
      setError("카메라가 아직 준비되지 않았어요.");
      return;
    }

    try {
      setError("");
      setIsCountingDown(true);
      setCountdown(5);

      await new Promise<void>((resolve) => {
        let remaining = 5;

        const interval = window.setInterval(() => {
          remaining -= 1;

          if (remaining > 0) {
            setCountdown(remaining);
            return;
          }

          window.clearInterval(interval);
          setCountdown(null);
          resolve();
        }, 1000);
      });

      if (!videoRef.current) {
        throw new Error("카메라가 아직 준비되지 않았어요.");
      }

      setIsProcessing(true);

      const capturedBlob = await captureVideoFrame(videoRef.current);
      const originalImageUrl = await blobToDataUrl(capturedBlob);

      const shotIndex = isRetake && retakeIndex !== null ? retakeIndex : currentShotIndex;
      let finalImageUrl: string;

      if (isCustomShoot) {
        const overlayForShot = overlayPhotos[shotIndex];
        const overlaySide: "left" | "right" = shotIndex % 2 === 0 ? "left" : "right";
        if (overlayForShot) {
          try {
            const composited = await compositeOverlay(capturedBlob, overlayForShot, overlaySide);
            finalImageUrl = await blobToDataUrl(composited);
          } catch (e) {
            console.error("오버레이 합성 실패, 원본만 사용:", e);
            finalImageUrl = originalImageUrl;
          }
        } else {
          finalImageUrl = originalImageUrl;
        }
      } else {
        const userTransparentBlob = await removeBackground(capturedBlob);
        finalImageUrl = await blobToDataUrl(userTransparentBlob);
      }

      const transparentImageUrl = finalImageUrl;

      let nextImages: string[];
      let nextOriginals: string[];
      if (isRetake && retakeIndex !== null) {
        nextImages = [...capturedImages];
        nextImages[retakeIndex] = transparentImageUrl;
        nextOriginals = [...capturedOriginals];
        nextOriginals[retakeIndex] = originalImageUrl;
      } else {
        nextImages = [...capturedImages, transparentImageUrl];
        nextOriginals = [...capturedOriginals, originalImageUrl];
      }
      setCapturedImages(nextImages);
      setCapturedOriginals(nextOriginals);

      if (isRetake) {
        const resultPayload: ResultPayload = {
          frameId,
          shotCount,
          frameTitle,
          photos: nextImages,
          originals: nextOriginals,
          sourceType,
          frameOwnerId,
          overlayPhotos: isCustomShoot ? overlayPhotos : undefined,
        };
        sessionStorage.setItem("photoResultData", JSON.stringify(resultPayload));
        navigate("/photo/result", { state: resultPayload });
        return;
      }

      const isLastShot = currentShotIndex >= shotCount - 1;

      if (!isLastShot) {
        setCurrentShotIndex((prev) => prev + 1);
        return;
      }

      const resultPayload: ResultPayload = {
        frameId,
        shotCount,
        frameTitle,
        photos: nextImages,
        originals: nextOriginals,
        sourceType,
        frameOwnerId,
        overlayPhotos: isCustomShoot ? overlayPhotos : undefined,
      };

      sessionStorage.setItem("photoResultData", JSON.stringify(resultPayload));

      navigate("/photo/result", {
        state: resultPayload,
      });
    } catch (captureError) {
      const message = captureError instanceof Error ? captureError.message : "사진 처리 중 오류가 발생했어요.";
      setError(message);
      setCountdown(null);
    } finally {
      setIsCountingDown(false);
      setIsProcessing(false);
    }
  }, [capturedImages, capturedOriginals, currentShotIndex, frameId, frameTitle, isCountingDown, isProcessing, isRetake, retakeIndex, navigate, shotCount, isCustomShoot, overlayPhotos, sourceType, frameOwnerId, setError, videoRef]);

  const handleResetShots = () => {
    setCurrentShotIndex(0);
    setCapturedImages([]);
    setCapturedOriginals([]);
    setError("");
    setCountdown(null);
    setIsCountingDown(false);
    sessionStorage.removeItem("photoResultData");
  };
  return (
    <div className="framie-takephoto-page">
      <style>{`
        @keyframes countdownPulse {
          0% {
            transform: scale(0.78);
            opacity: 0.42;
          }
          45% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.12);
            opacity: 0.22;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <BackButton variant="text" color={PRIMARY} />
        <div style={{ marginBottom: 20 }} />

        <header style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src={h1}
            alt="Frame preview"
            className="custom2-previewImg"
            style={{ display: "block", margin: "0 auto" }}
          />

          <p
            style={{
              margin: "14px 0 0",
              fontSize: 20,
              color: PRIMARY,
              fontWeight: 400,
            }}
          >
            {isRetake
              ? `${(retakeIndex as number) + 1}번째 컷을 다시 찍어요`
              : `${frameTitle} 촬영을 준비하고 있어요`}
          </p>
        </header>

        <main className="framie-takephoto-grid">
          <section
            aria-label="카메라 미리보기"
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              background: "#d9d9d9",
              borderRadius: 24,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              boxShadow: "0 16px 40px rgba(48, 71, 217, 0.08)",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: "scaleX(-1)",
              }}
            />

            {isCustomShoot && overlayPhotos[currentShotIndex] ? (
              <img
                src={overlayPhotos[currentShotIndex]}
                alt="프레임 오버레이"
                crossOrigin="anonymous"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: currentShotIndex % 2 === 0 ? "left center" : "right center",
                  pointerEvents: "none",
                  opacity: 0.75,
                  zIndex: 1,
                }}
              />
            ) : null}

            <div
              style={{
                position: "absolute",
                top: 18,
                left: 18,
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.88)",
                color: PRIMARY,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              {isRetake
                ? `${(retakeIndex as number) + 1} / ${shotCount} 컷 재촬영 중`
                : `${Math.min(currentShotIndex + 1, shotCount)} / ${shotCount} 컷 진행 중`}
            </div>

            {!isCustomShoot && (brightness === "too_bright" || brightness === "too_dark") ? (
              <div
                role="alert"
                style={{
                  position: "absolute",
                  top: 64,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 1,
                  padding: "10px 16px",
                  borderRadius: 999,
                  background:
                    brightness === "too_bright"
                      ? "rgba(255, 159, 28, 0.92)"
                      : "rgba(40, 48, 70, 0.92)",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.22)",
                }}
              >
                {brightness === "too_bright"
                  ? "배경이 너무 밝아서 배경 제거가 원활하지 않을 수 있어요"
                  : "배경이 너무 어두워서 배경 제거가 원활하지 않을 수 있어요"}
              </div>
            ) : null}

            {isCountingDown && countdown ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.28)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  zIndex: 2,
                  backdropFilter: "blur(2px)",
                }}
              >
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    border: "2px solid rgba(255,255,255,0.58)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "countdownPulse 1s ease-in-out infinite",
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.22)",
                  }}
                >
                  <span
                    style={{
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: 58,
                      lineHeight: 1,
                    }}
                  >
                    {countdown}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#ffffff",
                    fontWeight: 400,
                    fontSize: 18,
                    textShadow: "0 6px 18px rgba(15, 23, 42, 0.3)",
                  }}
                >
                  잠시만요, 곧 촬영돼요
                </p>
              </div>
            ) : null}
          </section>

          <aside
            style={{
              background: "rgba(255,255,255,0.95)",
              border: "1.5px solid rgba(48, 71, 217, 0.14)",
              borderRadius: 28,
              padding: 24,
              boxShadow: "0 12px 30px rgba(48, 71, 217, 0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  fontSize: 22,
                  color: PRIMARY,
                }}
              >
                컷 진행 상태
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontWeight: 400,
                  fontSize: 14,
                  color: "#5b67b8",
                  lineHeight: 1.5,
                }}
              >
                {isCustomShoot
                  ? "사진을 찍으면 프레임 주인 사진과 합성돼요."
                  : "사진을 찍으면 배경 제거 후 투명 PNG 상태로 결과 화면에 넘겨져요."}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {shotSlots.map((slotIndex) => {
                const isActive = slotIndex === currentShotIndex;
                const isDone = slotIndex < capturedImages.length;

                return (
                  <div
                    key={slotIndex}
                    style={{
                      borderRadius: 18,
                      padding: "14px 16px",
                      border: isActive
                        ? `2px solid ${PRIMARY}`
                        : "1.5px solid rgba(48, 71, 217, 0.16)",
                      background: isDone
                        ? "rgba(48, 71, 217, 0.08)"
                        : isActive
                        ? "rgba(48, 71, 217, 0.05)"
                        : "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: PRIMARY,
                          fontSize: 16,
                        }}
                      >
                        {slotIndex + 1}번째 컷
                      </span>
                      <span
                        style={{
                          fontWeight: 400,
                          color: "#6874c8",
                          fontSize: 13,
                        }}
                      >
                        {isActive
                          ? isRetake
                            ? "재촬영 차례"
                            : "현재 촬영 차례"
                          : isDone
                          ? "촬영 완료"
                          : "대기 중"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={handleCaptureShot}
                disabled={isProcessing || isCountingDown}
                style={{
                  border: "none",
                  borderRadius: 18,
                  background: PRIMARY,
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: 16,
                  padding: "16px 18px",
                  cursor: isProcessing || isCountingDown ? "wait" : "pointer",
                  opacity: isProcessing || isCountingDown ? 0.72 : 1,
                }}
              >
                {isCountingDown
                  ? `${countdown ?? 5}초 후 촬영`
                  : isProcessing
                  ? (isCustomShoot ? "사진 합성 중..." : "배경 제거 중...")
                  : isRetake
                  ? "다시 찍기"
                  : currentShotIndex === shotCount - 1
                  ? "마지막 사진 찍기"
                  : "사진 찍기"}
              </button>

              {!isRetake && (
                <button
                  type="button"
                  onClick={handleResetShots}
                  disabled={isProcessing || isCountingDown}
                  style={{
                    border: "1.5px solid rgba(48, 71, 217, 0.22)",
                    borderRadius: 18,
                    background: "#ffffff",
                    color: PRIMARY,
                    fontWeight: 400,
                    fontSize: 15,
                    padding: "14px 18px",
                    cursor: isProcessing || isCountingDown ? "not-allowed" : "pointer",
                    opacity: isProcessing || isCountingDown ? 0.68 : 1,
                  }}
                >
                  처음부터 다시 찍기
                </button>
              )}
            </div>


            {capturedImages.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {capturedImages.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    style={{
                      borderRadius: 14,
                      background: "rgba(48, 71, 217, 0.05)",
                      minHeight: 92,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "1px solid rgba(48, 71, 217, 0.1)",
                    }}
                  >
                    <img
                      src={image}
                      alt={`${index + 1}번째 컷 미리보기`}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color: "#5b5b5b",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {error}
              </p>
            ) : null}
          </aside>
        </main>
      </div>
    </div>
  );
}
