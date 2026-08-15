type ClassModalProps = {
  isOpen: boolean;
  classDraft: { cabang: string; kelas: string; sekolah: string; jenjang?: string };
  fixedCabang?: string;
  showSekolahField?: boolean;
  classError: string;
  onClose: () => void;
  onDraftChange: (field: "cabang" | "kelas" | "sekolah" | "jenjang", value: string) => void;
  onSave: () => void;
};

export function ClassModal({
  isOpen,
  classDraft,
  fixedCabang,
  showSekolahField,
  classError,
  onClose,
  onDraftChange,
  onSave,
}: ClassModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3 shadow p-4 w-100"
        style={{ maxWidth: 460 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-1">Tambah Kelas</h5>
            <div className="text-muted small">
              {showSekolahField
                ? "Tambahkan kelas dan sekolah agar tampil di Jadwal Tambahan & Pelayanan."
                : "Tambahkan cabang dan kelas baru agar tampil di tabel jadwal."}
            </div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div className="mt-3">
          <label className="form-label small fw-semibold">Cabang</label>
          {fixedCabang ? (
            <input value={fixedCabang} className="form-control form-control-sm" disabled />
          ) : (
            <input
              value={classDraft.cabang}
              onChange={(event) => onDraftChange("cabang", event.target.value)}
              placeholder="Semarang 1"
              className="form-control form-control-sm"
            />
          )}
          <label className="form-label small fw-semibold mt-3">Kelas</label>
          <input
            value={classDraft.kelas}
            onChange={(event) => onDraftChange("kelas", event.target.value)}
            placeholder="PIKPU-1"
            className="form-control form-control-sm"
          />
          <label className="form-label small fw-semibold mt-3">Jenjang Studi</label>
          <select
            className="form-control form-control-sm"
            value={classDraft.jenjang || ""}
            onChange={(event) => onDraftChange("jenjang", event.target.value)}
          >
            <option value="">Pilih Jenjang Studi</option>
            <option value="3 SMA">3 SMA</option>
            <option value="2 SMA">2 SMA</option>
            <option value="1 SMA">1 SMA</option>
            <option value="3 SMP">3 SMP</option>
            <option value="2 SMP">2 SMP</option>
            <option value="1 SMP">1 SMP</option>
            <option value="6 SD">6 SD</option>
            <option value="5 SD">5 SD</option>
            <option value="4 SD">4 SD</option>
          </select>
          {showSekolahField && (
            <>
              <label className="form-label small fw-semibold mt-3">Sekolah</label>
              <div className="input-group">
                <input
                  value={classDraft.sekolah}
                  onChange={(event) => onDraftChange("sekolah", event.target.value)}
                  placeholder="SMA N1 Semarang"
                  className="form-control form-control-sm"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    const val = window.prompt("Pilih atau masukkan nama sekolah:", classDraft.sekolah || "");
                    if (val !== null) onDraftChange("sekolah", val);
                  }}
                >
                  Pilih
                </button>
              </div>
            </>
          )}
          {classError && (
            <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
              {classError}
            </div>
          )}
        </div>
        <div className="mt-4 d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave}>
            Simpan Kelas
          </button>
        </div>
      </div>
    </div>
  );
}