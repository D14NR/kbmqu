import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type RouteProgressBarProps = {
  isNavigating: boolean;
};

export function RouteProgressBar({ isNavigating }: RouteProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer1: number;
    let timer2: number;
    let timer3: number;
    let hideTimer: number;

    if (isNavigating) {
      setVisible(true);
      setProgress(15);

      timer1 = window.setTimeout(() => {
        setProgress(45);
      }, 50);

      timer2 = window.setTimeout(() => {
        setProgress(75);
      }, 150);

      timer3 = window.setTimeout(() => {
        setProgress(90);
      }, 250);
    } else if (visible) {
      setProgress(100);
      hideTimer = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      window.clearTimeout(timer3);
      window.clearTimeout(hideTimer);
    };
  }, [isNavigating, visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            zIndex: 9999,
            pointerEvents: "none",
            overflow: "hidden",
            background: "rgba(226, 232, 240, 0.4)",
          }}
        >
          {/* Animated Gradient Bar */}
          <motion.div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)",
              boxShadow: "0 0 10px rgba(99, 102, 241, 0.7), 0 0 5px rgba(59, 130, 246, 0.5)",
              transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          {/* Glowing Head Point */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: `${100 - progress}%`,
              width: "100px",
              height: "100%",
              boxShadow: "0 0 12px #6366f1, 0 0 6px #3b82f6",
              opacity: 0.8,
              transform: "rotate(3deg) translate(0px, -2px)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
