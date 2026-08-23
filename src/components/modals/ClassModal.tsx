import { useEffect, useState, useRef } from "react";
import { apiFetch } from "../../lib/api";

type SekolahOption = {
  id: string;
  nama_sekolah: string;
  jenjang_studi: string;
};

type ClassModalProps = {
  isOpen: boolean;
  isEditing?: boolean;
  classDraft: { cabang: string; kelas: string; sekolah: string; jenjang?: string; classOrder?: string | number };
  fixedCabang?: string;
  showSekolahField?: boolean;
  classError: string;
  onClose: () => void;
  onDraftChange: (field: "cabang" | "kelas" | "sekolah" | "jenjang" | "classOrder", value: string) => void;
  onSave: () => void;
};

export function ClassModal({
  isOpen,
  isEditing,
  classDraft,
  fixedCabang,
  showSekolahField,
  classError,
  onClose,
  onDraftChange,
  onSave,
}: ClassModalProps) {
  const [sekolahOptions, setSekolahOptions] = useState<SekolahOption[]>([]);
  const [showSekolahPicker, setShowSekolahPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [sekolahFilter, setSekolahFilter] = useState("");

  useEffect(() => {
    if (!isOpen || !showSekolahField) return;
    let mounted = true;
    (async () => {
      try {
        const rows = await apiFetch<any[]>(`/db/sekolah`);
        if (!mounted) return;
        const options = (rows || [])
          .map((r: any) => ({
            id: String(r.id || ""),
            nama_sekolah: String(r.nama_sekolah || "").trim(),
            jenjang_studi: String(r.jenjang_studi || "").trim(),
          }))
          .filter((row) => row.nama_sekolah);
        setSekolahOptions(options);
      } catch (e) {
        console.error("Failed to load sekolah list:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen, showSekolahField]);

  useEffect(() => {
    if (!showSekolahPicker) return;
    const onDocClick = (e: MouseEvent) => {
      if (!pickerRef.current) return;
      if (!(pickerRef.current as any).contains(e.target)) {
        setShowSekolahPicker(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showSekolahPicker]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 1050,
      }}
    >
      <div
        className="modal-content-card bg-white rounded-4 shadow-lg border w-100 overflow-hidden"
        style={{
          maxWidth: 480,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="modal-header-modern bg-white p-3 p-sm-4 border-bottom d-flex justify-content-between align-items-start gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 44, height: 44 }}
            >
              <i className={`bi ${isEditing ? "bi-pencil-square" : "bi-mortarboard-fill"} fs-4`} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h5 className="fw-bold mb-0 text-dark">{isEditing ? "Edit Kelas" : "Tambah Kelas Baru"}</h5>
                {isEditing && classDraft.classOrder !== undefined && classDraft.classOrder !== "" && classDraft.classOrder !== null && (
                  <span
                    className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle rounded-pill px-2 py-0.5 font-monospace text-xxs"
                    title={`Urutan Kelas: ${classDraft.classOrder}`}
                  >
                    <i className="bi bi-sort-numeric-down me-1" />
                    #{classDraft.classOrder}
                  </span>
                )}
              </div>
              <div className="text-muted text-xxs">
                {isEditing
                  ? "Perbarui detail nama atau jenjang kelas."
                  : showSekolahField
                  ? "Tambahkan kelas & asal sekolah untuk jadwal tambahan/pelayanan."
                  : "Daftarkan kelas baru untuk alokasi jadwal KBM reguler."}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-light btn-sm rounded-circle p-0 text-muted d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 32, height: 32 }}
            onClick={onClose}
            aria-label="Tutup"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* 2. Modal Body */}
        <div className="modal-body-modern p-3 p-sm-4 overflow-y-auto" style={{ flex: "1 1 auto" }}>
          <div className="d-flex flex-column gap-3">
            {/* Field: Cabang */}
            <div>
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-geo-alt text-primary" />
                Cabang
              </label>
              {fixedCabang ? (
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    <i className="bi bi-lock-fill" />
                  </span>
                  <input
                    value={fixedCabang}
                    className="form-control border-start-0 bg-light fw-semibold text-muted"
                    disabled
                  />
                </div>
              ) : (
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-building text-muted" />
                  </span>
                  <input
                    value={classDraft.cabang}
                    onChange={(event) => onDraftChange("cabang", event.target.value)}
                    placeholder="Contoh: Semarang 1"
                    className="form-control border-start-0"
                  />
                </div>
              )}
            </div>

            {/* Field: Nama Kelas */}
            <div>
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-mortarboard text-primary" />
                Nama Kelas <span className="text-danger">*</span>
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-tag text-muted" />
                </span>
                <input
                  value={classDraft.kelas}
                  onChange={(event) => onDraftChange("kelas", event.target.value)}
                  placeholder="Contoh: 12 IPA 1, PIKPU-1, 9 SMP A"
                  className="form-control border-start-0 fw-semibold"
                />
              </div>
            </div>

            {/* Field: Jenjang Studi */}
            <div>
              <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                <i className="bi bi-journal-bookmark text-primary" />
                Jenjang Studi
              </label>
              <select
                className="form-select form-select-sm fw-medium"
                value={classDraft.jenjang || ""}
                onChange={(event) => onDraftChange("jenjang", event.target.value)}
              >
                <option value="">-- Pilih Jenjang Studi --</option>
                <optgroup label="Tingkat SMA / Sederajat">
                  <option value="3 SMA">3 SMA / 12 SMA</option>
                  <option value="2 SMA">2 SMA / 11 SMA</option>
                  <option value="1 SMA">1 SMA / 10 SMA</option>
                  <option value="Alumni">Alumni / Gap Year</option>
                </optgroup>
                <optgroup label="Tingkat SMP / Sederajat">
                  <option value="3 SMP">3 SMP / 9 SMP</option>
                  <option value="2 SMP">2 SMP / 8 SMP</option>
                  <option value="1 SMP">1 SMP / 7 SMP</option>
                </optgroup>
                <optgroup label="Tingkat SD / Sederajat">
                  <option value="6 SD">6 SD</option>
                  <option value="5 SD">5 SD</option>
                  <option value="4 SD">4 SD</option>
                  <option value="3 SD">3 SD</option>
                  <option value="2 SD">2 SD</option>
                  <option value="1 SD">1 SD</option>
                </optgroup>
              </select>
            </div>

            {/* Field: Urutan Kelas (Class Order) */}
            <div>
              <div className="d-flex align-items-center justify-content-between mb-1.5">
                <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                  <i className="bi bi-sort-numeric-down text-primary" />
                  Urutan Kelas (Class Order)
                </label>
                <span className="text-muted text-xxs">Posisi baris di tabel</span>
              </div>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-hash text-muted" />
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={classDraft.classOrder !== undefined && classDraft.classOrder !== null ? classDraft.classOrder : ""}
                  onChange={(event) => onDraftChange("classOrder", event.target.value)}
                  placeholder="Contoh: 1, 2, 10, 11..."
                  className="form-control border-start-0 fw-semibold"
                />
              </div>
              <div className="text-muted text-xxs mt-1">
                Gunakan angka unik untuk mengatur urutan tampilan baris kelas pada tabel jadwal (misal: 1, 2, 3...).
              </div>
            </div>

            {/* Field: Sekolah (Jadwal Tambahan) */}
            {showSekolahField && (
              <div>
                <label className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                  <i className="bi bi-building text-primary" />
                  Asal Sekolah
                </label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted" />
                  </span>
                  <input
                    list="sekolah-list"
                    value={classDraft.sekolah}
                    onChange={(event) => onDraftChange("sekolah", event.target.value)}
                    placeholder="Pilih dari master data atau ketik manual..."
                    className="form-control border-start-0"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setShowSekolahPicker((s) => !s)}
                  >
                    <i className="bi bi-list-ul me-1" />
                    Pilih
                  </button>
                </div>
                <datalist id="sekolah-list">
                  {sekolahOptions.map((option) => (
                    <option key={option.id || option.nama_sekolah} value={option.nama_sekolah} />
                  ))}
                </datalist>

                {/* Popover Sekolah Picker */}
                {showSekolahPicker && (
                  <div
                    ref={pickerRef}
                    className="border rounded-3 p-3 mt-2 shadow-sm bg-white"
                    style={{ width: "100%", maxHeight: 260, overflow: "auto", zIndex: 2000 }}
                  >
                    <div className="input-group input-group-sm mb-2">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-search text-muted" />
                      </span>
                      <input
                        className="form-control border-start-0"
                        placeholder="Filter nama sekolah..."
                        value={sekolahFilter}
                        onChange={(e) => setSekolahFilter(e.target.value)}
                      />
                    </div>
                    {sekolahOptions.length === 0 ? (
                      <div className="text-muted text-xxs text-center py-2">Tidak ada data sekolah terdaftar.</div>
                    ) : (
                      (() => {
                        const filtered = sekolahOptions.filter(
                          (option) =>
                            option.nama_sekolah.toLowerCase().includes(sekolahFilter.toLowerCase()) &&
                            (!classDraft.jenjang ||
                              option.jenjang_studi.toLowerCase() === classDraft.jenjang.toLowerCase())
                        );
                        const optionsToShow =
                          filtered.length > 0
                            ? filtered
                            : sekolahOptions.filter((option) =>
                                option.nama_sekolah.toLowerCase().includes(sekolahFilter.toLowerCase())
                              );

                        if (optionsToShow.length === 0) {
                          return (
                            <div className="text-muted text-xxs text-center py-2">
                              Tidak ada sekolah yang cocok.
                            </div>
                          );
                        }

                        return optionsToShow.map((option) => {
                          const name = option.nama_sekolah;
                          const selected = classDraft.sekolah === name;
                          return (
                            <div
                              key={option.id || name}
                              role="button"
                              tabIndex={0}
                              className={`d-flex align-items-center justify-content-between p-2 rounded-2 mb-1 border ${
                                selected ? "bg-primary-subtle border-primary text-primary" : "bg-light border-light text-dark"
                              }`}
                              onClick={() => {
                                onDraftChange("sekolah", name);
                                setShowSekolahPicker(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  onDraftChange("sekolah", name);
                                  setShowSekolahPicker(false);
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              <div>
                                <div className="fw-semibold small">{name}</div>
                                <div className="text-muted text-xxs">{option.jenjang_studi}</div>
                              </div>
                              {selected && <i className="bi bi-check2-circle text-primary fs-5" />}
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error Alert */}
            {classError && (
              <div className="alert alert-danger d-flex align-items-center gap-2 p-2.5 rounded-3 mb-0 text-xs" role="alert">
                <i className="bi bi-exclamation-circle-fill text-danger fs-6 flex-shrink-0" />
                <div>{classError}</div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="modal-footer-modern bg-light p-3 border-top d-flex justify-content-end align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm px-3 rounded-2"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm px-4 fw-semibold shadow-sm d-flex align-items-center gap-1.5 rounded-2"
            onClick={onSave}
            disabled={!classDraft.kelas.trim()}
          >
            <i className="bi bi-check2-circle" />
            <span>{isEditing ? "Simpan Perubahan" : "Simpan Kelas"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
