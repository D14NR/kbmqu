import { motion, AnimatePresence } from "motion/react";

type ConfirmDialogProps = {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  title = "Konfirmasi",
  message,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
          onClick={loading ? undefined : onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-white rounded-3 shadow p-4 w-100 modal-content-card"
            style={{ maxWidth: 420 }}
            onClick={(event) => event.stopPropagation()}
          >
            <h5 className="mb-2">{title}</h5>
            <p className="text-muted mb-0">{message}</p>
            <div className="mt-4 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </button>
              <button type="button" className="btn btn-danger btn-sm d-flex align-items-center justify-content-center gap-2" onClick={onConfirm} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Memproses...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}