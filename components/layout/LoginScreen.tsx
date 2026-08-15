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
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3">
      <div className="card shadow-sm w-100" style={{ maxWidth: 380 }}>
        <div className="card-body p-4">
          <h1 className="h5 mb-1">Login Aplikasi Jadwal</h1>
          <p className="text-muted mb-3">Masuk untuk membuka dashboard.</p>

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

          {error ? <div className="alert alert-danger py-2 mb-3">{error}</div> : null}

          <button type="button" className="btn btn-primary w-100" onClick={onSubmit}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}