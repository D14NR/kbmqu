import React, { useState } from "react";

type ChangePasswordModalProps = {
  isOpen: boolean;
  username: string;
  cabang?: string;
  role?: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
};

export function ChangePasswordModal({
  isOpen,
  username,
  cabang,
  role,
  loading,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleResetAndClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-secondary" };
    if (pass.length < 4) return { score: 1, label: "Terlalu Pendek (Min. 4 Karakter)", color: "bg-danger" };
    if (pass.length < 6) return { score: 2, label: "Cukup", color: "bg-warning" };
    if (pass.length >= 8 && /[0-9]/.test(pass) && /[a-zA-Z]/.test(pass)) {
      return { score: 4, label: "Sangat Kuat", color: "bg-success" };
    }
    return { score: 3, label: "Kuat", color: "bg-info" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword.trim()) {
      setError("Password saat ini wajib diisi.");
      return;
    }

    if (!newPassword.trim()) {
      setError("Password baru wajib diisi.");
      return;
    }

    if (newPassword.trim().length < 3) {
      setError("Password baru minimal 3 karakter.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Password baru tidak boleh sama dengan password saat ini.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmit(currentPassword.trim(), newPassword.trim());
      if (res.success) {
        handleResetAndClose();
      } else {
        setError(res.message || "Gagal mengubah password.");
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat mengubah password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      style={{ zIndex: 1060 }}
      onClick={!isSubmitting && !loading ? handleResetAndClose : undefined}
    >
      <div
        className="bg-white rounded-4 shadow-lg border-0 p-4 w-100 animate-scale-up"
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start pb-3 border-bottom mb-3">
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center shadow-xs"
              style={{ width: 42, height: 42 }}
            >
              <i className="bi bi-shield-lock-fill fs-5" />
            </div>
            <div>
              <h5 className="mb-0 fw-bold text-dark">Ganti Password</h5>
              <div className="text-muted text-xs">Ubah kata sandi akun Anda</div>
            </div>
          </div>
          <button
            type="button"
            className="btn-close text-xs"
            aria-label="Tutup"
            disabled={isSubmitting || loading}
            onClick={handleResetAndClose}
          />
        </div>

        {/* User Badge Info */}
        <div className="p-2.5 px-3 bg-light rounded-3 d-flex align-items-center justify-content-between mb-3 border">
          <div className="d-flex align-items-center gap-2 min-w-0">
            <div
              className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center text-xs flex-shrink-0"
              style={{ width: 28, height: 28 }}
            >
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="fw-semibold text-dark text-xs text-truncate">{username}</div>
              <div className="text-muted text-xxs text-truncate">
                {cabang ? `Cabang ${cabang}` : role ? `Role: ${role}` : "Akun Aktif"}
              </div>
            </div>
          </div>
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill text-xxs px-2 py-1">
            Akun Login
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div className="mb-3">
            <label className="form-label text-xs fw-semibold text-dark d-flex justify-content-between align-items-center">
              <span>Password Saat Ini</span>
              <span className="text-danger">*</span>
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-key" />
              </span>
              <input
                type={showCurrent ? "text" : "password"}
                className="form-control border-start-0 border-end-0 ps-0"
                placeholder="Masukkan password saat ini"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (error) setError("");
                }}
                disabled={isSubmitting || loading}
                required
                autoFocus
              />
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                <i className={`bi ${showCurrent ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="mb-3">
            <label className="form-label text-xs fw-semibold text-dark d-flex justify-content-between align-items-center">
              <span>Password Baru</span>
              <span className="text-danger">*</span>
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-lock" />
              </span>
              <input
                type={showNew ? "text" : "password"}
                className="form-control border-start-0 border-end-0 ps-0"
                placeholder="Masukkan password baru"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
                disabled={isSubmitting || loading}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                <i className={`bi ${showNew ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>

            {/* Strength indicator */}
            {newPassword && (
              <div className="mt-1.5">
                <div className="progress" style={{ height: "4px" }}>
                  <div
                    className={`progress-bar ${strength.color}`}
                    role="progressbar"
                    style={{ width: `${(strength.score / 4) * 100}%` }}
                  />
                </div>
                <div className="d-flex justify-content-between text-xxs mt-1 text-muted">
                  <span>Kekuatan:</span>
                  <span className={`fw-semibold ${strength.score < 2 ? "text-danger" : strength.score === 2 ? "text-warning" : "text-success"}`}>
                    {strength.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-3">
            <label className="form-label text-xs fw-semibold text-dark d-flex justify-content-between align-items-center">
              <span>Konfirmasi Password Baru</span>
              <span className="text-danger">*</span>
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-check2-circle" />
              </span>
              <input
                type={showConfirm ? "text" : "password"}
                className="form-control border-start-0 border-end-0 ps-0"
                placeholder="Ketik ulang password baru"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                disabled={isSubmitting || loading}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                <i className={`bi ${showConfirm ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>
            {confirmPassword && newPassword && (
              <div className="text-xxs mt-1 d-flex align-items-center gap-1">
                {newPassword === confirmPassword ? (
                  <span className="text-success fw-medium">
                    <i className="bi bi-check-circle-fill me-1" />
                    Password cocok
                  </span>
                ) : (
                  <span className="text-danger fw-medium">
                    <i className="bi bi-x-circle-fill me-1" />
                    Password tidak cocok
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger py-2 px-3 text-xs mb-3 d-flex align-items-center gap-2 rounded-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-6 text-danger" />
              <div>{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="d-flex justify-content-end gap-2 pt-2 border-top mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3 rounded-3"
              onClick={handleResetAndClose}
              disabled={isSubmitting || loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm px-3 rounded-3 d-flex align-items-center gap-2 fw-medium shadow-xs"
              disabled={isSubmitting || loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {isSubmitting || loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg" />
                  <span>Simpan Password Baru</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
