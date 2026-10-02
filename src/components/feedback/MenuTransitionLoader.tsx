import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

type MenuTransitionLoaderProps = {
  menuName?: string;
};

export function MenuTransitionLoader({ menuName = "Halaman" }: MenuTransitionLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="d-flex flex-column align-items-center justify-content-center p-5 w-100 my-3"
      style={{ minHeight: "380px" }}
    >
      <div className="position-relative d-flex align-items-center justify-content-center mb-3">
        <div
          className="position-absolute rounded-circle bg-primary opacity-25 animate-ping"
          style={{ width: 48, height: 48 }}
        />
        <div
          className="rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center shadow-xs"
          style={{ width: 56, height: 56 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
            className="text-primary d-flex align-items-center justify-content-center"
          >
            <Loader2 size={30} className="text-primary" />
          </motion.div>
        </div>
      </div>

      <div className="fw-bold text-dark fs-6 mb-1">Memuat Data {menuName}...</div>
      <div className="text-muted text-xs mb-3">Mengambil data terbaru dari server database</div>

      {/* Modern Shimmering Skeleton Preview */}
      <div className="w-100 mt-2 d-flex flex-column gap-2.5" style={{ maxWidth: "620px" }}>
        {/* Search Toolbar Skeleton */}
        <div
          className="rounded-4 placeholder-glow p-3 bg-white border shadow-xs d-flex align-items-center justify-content-between gap-3"
        >
          <div className="rounded-3 bg-light placeholder col-6 py-2" style={{ height: "34px" }} />
          <div className="rounded-3 bg-light placeholder col-3 py-2" style={{ height: "34px" }} />
        </div>

        {/* Table Content Skeleton */}
        <div className="rounded-4 p-4 bg-white border shadow-xs d-flex flex-column gap-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="rounded-pill bg-light placeholder col-4 py-2" style={{ height: "20px" }} />
            <div className="rounded-pill bg-light placeholder col-2 py-2" style={{ height: "20px" }} />
          </div>
          <div className="rounded-3 bg-light placeholder w-100" style={{ height: "54px" }} />
          <div className="rounded-3 bg-light placeholder w-100" style={{ height: "54px" }} />
          <div className="rounded-3 bg-light placeholder w-100" style={{ height: "54px" }} />
        </div>
      </div>
    </motion.div>
  );
}
