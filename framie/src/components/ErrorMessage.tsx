type Props = {
  message: string;
};

export default function ErrorMessage({ message }: Props) {
  if (!message) return null;
  return (
    <p
      style={{
        margin: 0,
        fontSize: "0.9rem",
        color: "#ff4d4f",
        textAlign: "center",
      }}
    >
      {message}
    </p>
  );
}
