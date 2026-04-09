import type { ReactNode } from "react";

type Props = {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
};

export default function Modal({ onClose, children, maxWidth = "640px" }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,14,40,0.72)",
        backdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "32px",
          padding: "28px 24px",
          width: "100%",
          maxWidth,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 32px 80px rgba(10,14,40,0.24)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
