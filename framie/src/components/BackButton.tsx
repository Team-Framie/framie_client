import { useNavigate } from "react-router-dom";

type Props = {
  onClick?: () => void;
  variant?: "circle" | "text";
  color?: string;
};

export default function BackButton({ onClick, variant = "circle", color }: Props) {
  const navigate = useNavigate();
  const handleClick = onClick ?? (() => navigate(-1));

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={handleClick}
        style={{
          border: "none",
          background: "transparent",
          color: color ?? "#3047d9",
          fontWeight: 600,
          fontSize: 16,
          cursor: "pointer",
          padding: 0,
        }}
      >
        ← 돌아가기
      </button>
    );
  }

  return (
    <button
      type="button"
      className="framie-back-btn"
      onClick={handleClick}
      aria-label="뒤로가기"
    >
      <span className="framie-back-btn-arrow">‹</span>
    </button>
  );
}
