import { motion } from "motion/react";

type LoginScreenProps = {
  username: string;
  password: string;
  error: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function LoginScreen({
  username,
  password,
  error,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginScreenProps) {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 login-screen-wrap">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="card shadow-sm w-100 login-card"
        style={{ maxWidth: 400 }}
      >
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <motion.div
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="brand-badge"
            >
              <i className="bi bi-calendar-check" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="h5 mb-0">Login Aplikasi Jadwal</h1>
              <p className="text-muted mb-0">Masuk untuk membuka dashboard.</p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-3"
          >
            <label className="form-label">Username</label>
            <input
              className="form-control"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              placeholder="Masukkan username"
              autoComplete="username"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-3"
          >
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Masukkan password"
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSubmit();
                }
              }}
            />
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="alert alert-danger py-2 mb-3 login-error-alert"
            >
              {error}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="btn btn-primary w-100 app-btn-gradient"
              onClick={onSubmit}
            >
              Login
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}