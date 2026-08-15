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
            <h5 className="mb-1">{isEditing ? "Edit Kelas" : "Tambah Kelas"}</h5>
            <div className="text-muted small">
              {isEditing
                ? "Perbarui nama kelas agar seluruh jadwal terkait ikut berubah."
                : showSekolahField
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
                  list="sekolah-list"
                  value={classDraft.sekolah}
                  onChange={(event) => onDraftChange("sekolah", event.target.value)}
                  placeholder="Pilih dari daftar atau ketik sendiri"
                  className="form-control form-control-sm"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowSekolahPicker((s) => !s)}
                >
                  Pilih
                </button>
              </div>
              <datalist id="sekolah-list">
                {sekolahOptions.map((option) => (
                  <option key={option.id || option.nama_sekolah} value={option.nama_sekolah} />
                ))}
              </datalist>
              {showSekolahPicker && (
                <div
                  ref={pickerRef}
                  className="border rounded p-2 mt-1"
                  style={{ width: "100%", maxHeight: 260, overflow: "auto", background: "white", zIndex: 2000 }}
                >
                  <input
                    className="form-control form-control-sm mb-2"
                    placeholder="Cari..."
                    value={sekolahFilter}
                    onChange={(e) => setSekolahFilter(e.target.value)}
                  />
                  {sekolahOptions.length === 0 ? (
                    <div className="text-muted small">Tidak ada data sekolah.</div>
                  ) : (
                    (() => {
                      const filtered = sekolahOptions.filter((option) =>
                        option.nama_sekolah.toLowerCase().includes(sekolahFilter.toLowerCase()) &&
                        (!classDraft.jenjang ||
                          option.jenjang_studi.toLowerCase() === classDraft.jenjang.toLowerCase())
                      );
                      const optionsToShow = filtered.length > 0 ? filtered : sekolahOptions.filter((option) =>
                        option.nama_sekolah.toLowerCase().includes(sekolahFilter.toLowerCase())
                      );

                      if (optionsToShow.length === 0) {
                        return <div className="text-muted small">Tidak ada sekolah yang cocok.</div>;
                      }

                      return optionsToShow.map((option) => {
                        const name = option.nama_sekolah;
                        const selected = classDraft.sekolah === name;
                        return (
                          <div
                            key={option.id || name}
                            role="button"
                            tabIndex={0}
                            className={`d-flex align-items-center justify-content-between gap-2 py-2 px-2 ${selected ? "bg-primary text-white" : ""}`}
                            onClick={() => {
                              onDraftChange("sekolah", name);
                            }}
                            onDoubleClick={() => setShowSekolahPicker(false)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") onDraftChange("sekolah", name);
                            }}
                            style={{ cursor: "pointer", borderRadius: 6 }}
                          >
                            <div>
                              <div>{name}</div>
                              <div className="text-muted small">{option.jenjang_studi}</div>
                            </div>
                            <input type="checkbox" readOnly checked={selected} />
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              )}
              <div className="text-muted small mt-1">Pilih dari daftar atau ketik nama sekolah sendiri.</div>
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
            {isEditing ? "Simpan Perubahan" : "Simpan Kelas"}
          </button>
        </div>
      </div>
    </div>
  );
}