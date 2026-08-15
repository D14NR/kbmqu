type LoadingOverlayProps = {
  show: boolean;
  message?: string;
};

export function LoadingOverlay({ show, message = "Memproses data..." }: LoadingOverlayProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-label={message}>
      <div className="loading-panel">
        <div className="spinner-orbit" />
        <div className="loading-text">{message}</div>
      </div>
    </div>
  );
}
