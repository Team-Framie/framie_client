import h1 from "../../assets/frame_photo.svg";
import { useCamera } from "../../hooks/useCamera";

export default function Photo1() {
  const { videoRef, error } = useCamera();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fbf9f3",
        padding: "56px 24px 64px",
        boxSizing: "border-box",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 28 }}>
        <img src={h1} alt="Frame preview" className="custom2-previewImg" style={{ display: "block", margin: "0 auto" }} />

        <p
          style={{
            margin: "14px 0 0",
            fontSize: 20,
            color: "#3047d9",
            fontWeight: 400,
          }}
        >
          프레임과 사진 찍어보아요!!
        </p>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto" }}>
        <section
          aria-label="카메라 미리보기"
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#d9d9d9",
            borderRadius: 2,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
        </section>

        {error ? (
          <p
            role="alert"
            style={{
              margin: "14px 0 0",
              textAlign: "center",
              color: "#5b5b5b",
              fontSize: 14,
            }}
          >
            {error}
          </p>
        ) : null}
      </main>
    </div>
  );
}
