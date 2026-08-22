import { useEffect, useState } from "react";
import { listRows, insertRow, deleteRowsByIds } from "../../lib/database";
import { setNationalHolidays as setLocalNationalHolidays, getNationalHolidays as getLocalNationalHolidays } from "../../config/holidays";

export function HolidaysAdminView() {
  const [items, setItems] = useState<{ id?: string; date: string; label?: string }[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const rows = await listRows("libur_nasional");
        if (!mounted) return;
        if (rows.length > 0) {
          const mapped = rows.map((r) => ({ id: r.id, date: r.data.Tanggal || r.data.tanggal || "", label: r.data.Keterangan || r.data.keterangan_libur || "" }));
          const sorted = mapped.filter((it) => it.date).sort((a, b) => a.date.localeCompare(b.date));
          setItems(sorted);
          setLocalNationalHolidays(sorted);
          setLoading(false);
          return;
        }
      } catch (_e) {
        // ignore DB errors and fall back to local
      }
      if (!mounted) return;
      const local = getLocalNationalHolidays().map((it) => ({ date: it.date, label: it.label })).sort((a, b) => a.date.localeCompare(b.date));
      setItems(local);
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAdd = async () => {
    if (!dateInput) return;
    if (items.find((it) => it.date === dateInput)) return;
    setAdding(true);
    try {
      const row = await insertRow("libur_nasional", { Tanggal: dateInput, Keterangan: labelInput || "" });
      const next = [...items, { id: row.id, date: dateInput, label: labelInput || undefined }].sort((a, b) => a.date.localeCompare(b.date));
      setItems(next);
      setLocalNationalHolidays(next.map((it) => ({ date: it.date, label: it.label })));
      setDateInput("");
      setLabelInput("");
    } catch (_e) {
      // fallback: update local only
      const next = [...items, { date: dateInput, label: labelInput || undefined }].sort((a, b) => a.date.localeCompare(b.date));
      setItems(next);
      setLocalNationalHolidays(next.map((it) => ({ date: it.date, label: it.label })));
      setDateInput("");
      setLabelInput("");
    }
    setAdding(false);
  };

  const handleRemove = async (date: string) => {
    const found = items.find((it) => it.date === date && it.id);
    if (found && found.id) {
      try {
        await deleteRowsByIds([found.id]);
        const next = items.filter((it) => it.date !== date);
        setItems(next);
        setLocalNationalHolidays(next.map((it) => ({ date: it.date, label: it.label })));
        return;
      } catch (_e) {
        // fallthrough to local-only
      }
    }
    const next = items.filter((it) => it.date !== date);
    setItems(next);
    setLocalNationalHolidays(next.map((it) => ({ date: it.date, label: it.label })));
  };

  const getUpcomingHolidays = () => {
    const today = new Date().toISOString().split("T")[0];
    return items.filter(it => it.date >= today);
  };

  const upcomingHolidays = getUpcomingHolidays();

  return (
    <div className="py-2">
      {/* Header & Stats Bento */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
           <div>
             <h4 className="fw-bold text-dark d-flex align-items-center gap-2 mb-1">
               <i className="bi bi-calendar-heart text-danger" />
               Libur Nasional
             </h4>
             <p className="text-muted text-sm mb-0">Atur kalender libur operasional KBM.</p>
           </div>
        </div>
        <div className="col-12 col-md-8 d-flex gap-3 justify-content-md-end">
           <div className="bg-white border rounded-4 p-3 shadow-sm d-flex align-items-center gap-3" style={{ minWidth: 200 }}>
              <div className="rounded-circle bg-danger-subtle text-danger d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
                 <i className="bi bi-flag-fill fs-5" />
              </div>
              <div>
                 <div className="text-xs text-muted fw-semibold text-uppercase">Total Libur</div>
                 <div className="fs-5 fw-bold text-dark">{items.length} <span className="text-sm fw-normal text-muted">Hari</span></div>
              </div>
           </div>
           <div className="bg-white border rounded-4 p-3 shadow-sm d-flex align-items-center gap-3" style={{ minWidth: 200 }}>
              <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }}>
                 <i className="bi bi-calendar-event fs-5" />
              </div>
              <div>
                 <div className="text-xs text-muted fw-semibold text-uppercase">Libur Mendatang</div>
                 <div className="fs-5 fw-bold text-dark">{upcomingHolidays.length} <span className="text-sm fw-normal text-muted">Hari</span></div>
              </div>
           </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Form Insert */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
            <div className="card-header bg-white border-bottom p-4 pb-3">
              <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-plus-circle-fill text-primary" />
                Tambah Hari Libur
              </h6>
            </div>
            <div className="card-body p-4 bg-light">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">Tanggal Libur</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-calendar3 text-muted" />
                  </span>
                  <input 
                    type="date" 
                    className="form-control border-start-0 ps-0" 
                    value={dateInput} 
                    onChange={(e) => setDateInput(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="form-label small fw-semibold text-dark">Keterangan (Opsional)</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-card-text text-muted" />
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-start-0 ps-0" 
                    placeholder="Contoh: Idul Fitri" 
                    value={labelInput} 
                    onChange={(e) => setLabelInput(e.target.value)} 
                  />
                </div>
              </div>
              
              <button 
                className="btn btn-primary w-100 fw-medium shadow-sm d-flex align-items-center justify-content-center gap-2" 
                onClick={handleAdd}
                disabled={!dateInput || adding}
              >
                {adding ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="bi bi-save2" />
                    Simpan Libur
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
             <div className="card-header bg-white border-bottom p-4 pb-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-list-ul text-primary" />
                Daftar Tanggal Merah
              </h6>
            </div>
            
            <div className="card-body p-0">
              {loading ? (
                 <div className="p-5 text-center text-muted d-flex flex-column align-items-center gap-3">
                    <div className="spinner-border text-primary" role="status" />
                    <span>Memuat kalender libur...</span>
                 </div>
              ) : items.length === 0 ? (
                <div className="p-5 text-center text-muted d-flex flex-column align-items-center gap-3">
                   <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{width: 60, height: 60}}>
                     <i className="bi bi-calendar-x fs-2 text-secondary" />
                   </div>
                   <div>
                     <div className="fw-semibold text-dark">Belum ada hari libur</div>
                     <div className="text-sm">Tambahkan hari libur nasional menggunakan form di samping.</div>
                   </div>
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '60vh' }}>
                   <table className="table table-hover align-middle mb-0">
                      <thead className="table-light sticky-top">
                         <tr>
                            <th className="px-4 py-3 text-muted fw-semibold text-xs text-uppercase" style={{ width: 140 }}>Tanggal</th>
                            <th className="px-4 py-3 text-muted fw-semibold text-xs text-uppercase">Keterangan Libur</th>
                            <th className="px-4 py-3 text-muted fw-semibold text-xs text-uppercase text-end" style={{ width: 100 }}>Aksi</th>
                         </tr>
                      </thead>
                      <tbody>
                         {items.map((it) => {
                           const isUpcoming = it.date >= new Date().toISOString().split("T")[0];
                           const dateObj = new Date(it.date);
                           const formattedDate = dateObj.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
                           const dayName = dateObj.toLocaleDateString("id-ID", { weekday: 'long' });

                           return (
                             <tr key={it.date}>
                               <td className="px-4 py-3">
                                  <div className="fw-semibold text-dark text-sm">{formattedDate}</div>
                                  <div className="text-xs text-muted">{dayName}</div>
                               </td>
                               <td className="px-4 py-3">
                                  <div className="d-flex align-items-center gap-2">
                                     {isUpcoming && <span className="badge bg-danger-subtle text-danger rounded-pill border border-danger-subtle fw-medium" style={{ fontSize: '0.65rem' }}>Mendatang</span>}
                                     <span className="fw-medium text-dark text-sm">{it.label || "Libur Nasional"}</span>
                                  </div>
                               </td>
                               <td className="px-4 py-3 text-end">
                                 <button 
                                   className="btn btn-sm btn-outline-danger btn-icon shadow-sm rounded-3" 
                                   onClick={() => handleRemove(it.date)}
                                   aria-label="Hapus Libur"
                                   title="Hapus Libur"
                                 >
                                   <i className="bi bi-trash3" />
                                 </button>
                               </td>
                             </tr>
                           );
                         })}
                      </tbody>
                   </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
