import type { AppToast } from "../../types/app";
import { motion, AnimatePresence } from "motion/react";

type ToastStackProps = {
  toasts: AppToast[];
  onClose: (id: string) => void;
};

export function ToastStack({ toasts, onClose }: ToastStackProps) {
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
            className={`app-toast app-toast-${toast.type}`}
          >
            <div className="app-toast-body">{toast.message}</div>
            <button
              type="button"
              className="btn-close btn-close-sm"
              aria-label="Tutup notifikasi"
              onClick={() => onClose(toast.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
