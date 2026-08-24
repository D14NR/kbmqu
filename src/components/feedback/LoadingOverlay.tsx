import { motion, AnimatePresence } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";

type LoadingOverlayProps = {
  show: boolean;
  message?: string;
};

export function LoadingOverlay({ show, message = "Memproses data..." }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="loading-overlay"
          role="status"
          aria-live="polite"
          aria-label={message}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1090,
            background: "rgba(15, 23, 42, 0.35)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Top Edge Progress Bar (Vercel / GitHub Style) */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6, #3b82f6)",
              backgroundSize: "200% 100%",
              animation: "shimmerBar 1.5s infinite linear",
              transformOrigin: "left",
              boxShadow: "0 0 12px rgba(99, 102, 241, 0.8)",
              zIndex: 1100,
            }}
          />

          {/* Central Glassmorphism Card */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="shadow-2xl rounded-4 p-4 d-flex flex-column align-items-center"
            style={{
              minWidth: "280px",
              maxWidth: "360px",
              background: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
              boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8)",
            }}
          >
            {/* Orbital Glowing Icon Container */}
            <div className="position-relative d-flex align-items-center justify-content-center mb-3" style={{ width: "64px", height: "64px" }}>
              {/* Outer soft glowing pulse */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="position-absolute rounded-circle"
                style={{
                  inset: -4,
                  background: "radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(59, 130, 246, 0) 70%)",
                }}
              />

              {/* Animated Gradient Ring */}
              <div
                className="position-absolute rounded-circle"
                style={{
                  inset: 0,
                  border: "2.5px solid transparent",
                  borderTopColor: "#3b82f6",
                  borderRightColor: "#6366f1",
                  borderBottomColor: "#8b5cf6",
                  animation: "spin 1s linear infinite",
                  borderRadius: "50%",
                }}
              />

              {/* Inner Circle Badge */}
              <div
                className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                style={{
                  width: "48px",
                  height: "48px",
                  background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
                  color: "#4f46e5",
                }}
              >
                <Sparkles size={22} className="text-primary" />
              </div>
            </div>

            {/* Status Message */}
            <div className="text-center mb-3">
              <div className="fw-semibold text-dark fs-6" style={{ letterSpacing: "-0.01em" }}>
                {message}
              </div>
            </div>

            {/* Indeterminate Shimmer Progress Bar */}
            <div
              className="w-100 rounded-pill overflow-hidden"
              style={{
                height: "4px",
                background: "#e2e8f0",
                position: "relative",
              }}
            >
              <motion.div
                className="h-100 rounded-pill"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: "easeInOut",
                }}
                style={{
                  width: "60%",
                  background: "linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)",
                  boxShadow: "0 0 8px rgba(99, 102, 241, 0.5)",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


