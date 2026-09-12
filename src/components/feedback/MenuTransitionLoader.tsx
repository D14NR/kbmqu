import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

type MenuTransitionLoaderProps = {
  menuName?: string;
};

export function MenuTransitionLoader({ menuName = "Halaman" }: MenuTransitionLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="d-flex flex-column align-items-center justify-content-center p-5 w-100 my-4"
      style={{ minHeight: "360px" }}
    >
      <div className="position-relative d-flex align-items-center justify-content-center mb-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="text-primary"
        >
          <Loader2 size={36} className="text-primary" />
        </motion.div>
      </div>

      <div className="fw-bold text-dark fs-6 mb-1">Memuat {menuName}...</div>
      <div className="text-muted small">Menyiapkan tampilan data dan komponen</div>

      {/* Subtle Skeleton Preview */}
      <div className="w-100 mt-4 d-flex flex-column gap-2.5" style={{ maxWidth: "560px" }}>
        <div
          className="rounded-3 placeholder-glow"
          style={{ height: "42px", background: "#f1f5f9" }}
        />
        <div
          className="rounded-3 placeholder-glow"
          style={{ height: "120px", background: "#f8fafc", border: "1px solid #e2e8f0" }}
        />
        <div
          className="rounded-3 placeholder-glow"
          style={{ height: "60px", background: "#f8fafc", border: "1px solid #e2e8f0" }}
        />
      </div>
    </motion.div>
  );
}
