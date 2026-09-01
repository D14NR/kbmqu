import React from "react";

export type PendingIzinItem = {
  id: string;
  namaPengajar: string;
  domisili: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  keterangan: string;
  status: string;
};

export type PendingPermintaanItem = {
  id: string;
  namaPengajar: string;
  dariCabang: string;
  cabangPeminta: string;
  tanggal: string;
  sesi: string;
  status: string;
  keterangan: string;
};

type PendingNotificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userCabang?: string;
  isAdmin?: boolean;
  pendingIzinList: PendingIzinItem[];
  pendingPermintaanList: PendingPermintaanItem[];
  onNavigate: (menuKey: string) => void;
};

export function PendingNotificationModal({
  isOpen,
  onClose,
  userCabang,
  isAdmin,
  pendingIzinList,
  pendingPermintaanList,
  onNavigate,
}: PendingNotificationModalProps) {
  if (!isOpen) return null;

  const totalPending = pendingIzinList.length + pendingPermintaanList.length;

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div className="modal-header bg-warning-subtle text-dark border-bottom border-warning-subtle py-3 px-4">
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center bg-warning text-dark rounded-circle shadow-sm"
                style={{ width: 44, height: 44 }}
              >
                <i className="bi bi-bell-fill fs-5" />
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  Pemberitahuan Persetujuan
                  <span className="badge bg-danger text-white rounded-pill px-2.5 py-1 text-xs">
                    {totalPending} Perlu Aksi
                  </span>
                </h5>
                <div className="text-muted small">
                  {isAdmin
                    ? "Terdapat pengajuan yang memerlukan tindak lanjut Administrator."
                    : `Terdapat pengajuan yang memerlukan verifikasi / persetujuan Cabang ${userCabang || ""}.`}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4" style={{ maxHeight: "calc(80vh - 120px)", overflowY: "auto" }}>
            {totalPending === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-check-circle-fill text-success fs-1 mb-2 d-block" />
                <h6 className="fw-bold text-dark">Tidak Ada Permintaan Pending</h6>
                <p className="small mb-0">Semua pengajuan izin dan permintaan pengajar telah diproses.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-4">
                {/* 1. Section Izin Pengajar */}
                {pendingIzinList.length > 0 && (
                  <div className="border rounded-3 p-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2.5 pb-2 border-bottom">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-pill">
                          <i className="bi bi-calendar-x me-1" />
                          Izin Pengajar
                        </span>
                        <strong className="text-dark small">
                          {pendingIzinList.length} Pengajuan Menunggu Respon
                        </strong>
                      </div>
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-danger"
                        onClick={() => {
                          onClose();
                          onNavigate("izinPengajar");
                        }}
                      >
                        Buka Halaman Izin <i className="bi bi-arrow-right ms-1" />
                      </button>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      {pendingIzinList.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-2.5 rounded-2 border border-secondary-subtle d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2"
                        >
                          <div>
                            <div className="fw-bold text-dark">{item.namaPengajar}</div>
                            <div className="text-muted text-xs d-flex flex-wrap gap-2 mt-0.5">
                              <span>
                                <i className="bi bi-geo-alt me-1 text-primary" />
                                Domisili: <strong>{item.domisili || "-"}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                <i className="bi bi-calendar-range me-1 text-danger" />
                                {item.tanggalMulai} {item.tanggalSelesai ? `s/d ${item.tanggalSelesai}` : ""}
                              </span>
                            </div>
                            {item.keterangan && (
                              <div className="text-secondary text-xs fst-italic mt-1">
                                &quot;{item.keterangan}&quot;
                              </div>
                            )}
                          </div>
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 text-xxs rounded-pill">
                            Menunggu Persetujuan
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Section Permintaan Pengajar Antar Cabang */}
                {pendingPermintaanList.length > 0 && (
                  <div className="border rounded-3 p-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2.5 pb-2 border-bottom">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 rounded-pill">
                          <i className="bi bi-arrow-left-right me-1" />
                          Permintaan Antar Cabang
                        </span>
                        <strong className="text-dark small">
                          {pendingPermintaanList.length} Permintaan Menunggu Respon
                        </strong>
                      </div>
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-warning text-dark"
                        onClick={() => {
                          onClose();
                          onNavigate("permintaanPengajarAntarCabang");
                        }}
                      >
                        Buka Halaman Permintaan <i className="bi bi-arrow-right ms-1" />
                      </button>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      {pendingPermintaanList.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white p-2.5 rounded-2 border border-secondary-subtle d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2"
                        >
                          <div>
                            <div className="fw-bold text-dark">{item.namaPengajar}</div>
                            <div className="text-muted text-xs d-flex flex-wrap gap-2 mt-0.5">
                              <span>
                                Cabang: <strong>{item.dariCabang}</strong> &rarr; <strong>{item.cabangPeminta}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                <i className="bi bi-calendar-event me-1 text-primary" />
                                {item.tanggal} {item.sesi ? `(${item.sesi})` : ""}
                              </span>
                            </div>
                            {item.keterangan && (
                              <div className="text-secondary text-xs fst-italic mt-1">
                                &quot;{item.keterangan}&quot;
                              </div>
                            )}
                          </div>
                          <span className="badge bg-warning text-dark px-2 py-1 text-xxs rounded-pill">
                            Menunggu Konfirmasi
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer bg-light py-2.5 px-4 justify-content-between">
            <div className="text-muted small">
              <i className="bi bi-info-circle me-1" />
              Anda dapat membuka kembali jendela ini melalui ikon lonceng di pojok kanan atas.
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm px-3"
                onClick={onClose}
              >
                Tutup
              </button>
              {totalPending > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-3 fw-semibold"
                  onClick={() => {
                    onClose();
                    onNavigate("dashboard");
                  }}
                >
                  <i className="bi bi-speedometer2 me-1" />
                  Tinjau di Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
