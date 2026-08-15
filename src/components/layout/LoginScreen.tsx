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
      <div className="card shadow-sm w-100 login-card" style={{ maxWidth: 400 }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="brand-badge">
              <i className="bi bi-calendar-check" />
            </div>
            <div>
              <h1 className="h5 mb-0">Login Aplikasi Jadwal</h1>
              <p className="text-muted mb-0">Masuk untuk membuka dashboard.</p>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              placeholder="Masukkan username"
              autoComplete="username"
            />
          </div>

          <div className="mb-3">
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
          </div>

          {error ? <div className="alert alert-danger py-2 mb-3 login-error-alert">{error}</div> : null}

          <button type="button" className="btn btn-primary w-100 app-btn-gradient" onClick={onSubmit}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}