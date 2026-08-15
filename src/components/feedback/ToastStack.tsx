import type { AppToast } from "../../types/app";

type ToastStackProps = {
  toasts: AppToast[];
  onClose: (id: string) => void;
};

export function ToastStack({ toasts, onClose }: ToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`app-toast app-toast-${toast.type}`}>
          <div className="app-toast-body">{toast.message}</div>
          <button
            type="button"
            className="btn-close btn-close-sm"
            aria-label="Tutup notifikasi"
            onClick={() => onClose(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
