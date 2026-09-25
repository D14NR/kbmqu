import type { AppToast } from "../../types/app";
import { motion, AnimatePresence } from "motion/react";

type ToastStackProps = {
  toasts: AppToast[];
  onClose: (id: string) => void;
};

export function ToastStack({ toasts, onClose }: ToastStackProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <i className="bi bi-check-circle-fill flex-shrink-0" style={{ fontSize: "16px" }} />;
      case "error":
        return <i className="bi bi-exclamation-triangle-fill flex-shrink-0" style={{ fontSize: "16px" }} />;
      case "info":
      default:
        return <i className="bi bi-info-circle-fill flex-shrink-0" style={{ fontSize: "16px" }} />;
    }
  };

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`app-toast app-toast-${toast.type} d-flex align-items-center gap-2.5 shadow-lg`}
            onClick={() => onClose(toast.id)}
            title="Klik untuk menutup notifikasi"
          >
            {getIcon(toast.type)}
            <div className="app-toast-body fw-semibold">{toast.message}</div>
            <button
              type="button"
              className="btn-close btn-close-sm ms-2"
              aria-label="Tutup notifikasi"
              onClick={(e) => {
                e.stopPropagation();
                onClose(toast.id);
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
