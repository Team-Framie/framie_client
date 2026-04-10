import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Custom1.css";
import h1 from "../../assets/customlogo.svg";
import { api } from "../../lib/api";
import BackButton from "../../components/BackButton";
import ErrorMessage from "../../components/ErrorMessage";
import type { Frame, SessionPhoto } from "../../types/photos";

type Session = {
  id: string;
  frame_id: string;
  frame_owner_id: string | null;
  frame: Frame | null;
  photos: SessionPhoto[] | null;
  result_image_url: string | null;
  result_thumbnail_url: string | null;
  creator_username: string | null;
  user_message: string | null;
};

export default function Custom1() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await api.share.getByCode(trimmed);
      const session = res.session as Session | null;

      if (!session || !session.frame) {
        setError("프레임 정보를 찾을 수 없어요.");
        return;
      }

      const frame = session.frame;

      const sortedPhotos = [...(session.photos ?? [])].sort((a, b) => a.shot_order - b.shot_order);
      const overlayPhotos = sortedPhotos
        .map((p) => p.photo_url)
        .filter((u): u is string => !!u);

      const resultImageUrl = session.result_image_url ?? session.result_thumbnail_url ?? null;

      navigate("/custom2", {
        state: {
          frameId: frame.id,
          shotCount: frame.shot_count,
          frameTitle: frame.title || `${frame.shot_count}컷`,
          overlayPhotos,
          sourceType: "other_frame",
          frameOwnerId: session.frame_owner_id ?? undefined,
          displayUserId: session.creator_username ? `@${session.creator_username}` : null,
          userMessage: session.user_message ?? null,
          resultImageUrl,
        },
      });
    } catch {
      setError("코드를 찾을 수 없어요. 다시 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="custom1-page">
      <BackButton />

      <main className="custom1-container">
        <img src={h1} alt="Custom1" className="custom1-logo" />

        <label className="custom1-inputWrap">
          <span className="sr-only">코드 입력</span>
          <input
            className="custom1-input"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleSubmit(); }}
            placeholder="코드 입력"
            inputMode="text"
            autoComplete="off"
            disabled={isLoading}
          />
        </label>

        <ErrorMessage message={error} />

        <button
          type="button"
          className="custom1-submit"
          onClick={handleSubmit}
          disabled={!code.trim() || isLoading}
        >
          {isLoading ? "확인 중..." : "입력 완료"}
        </button>
      </main>
    </div>
  );
}
