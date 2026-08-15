import { useEffect, useState } from "react";
import { listRows, insertRow, deleteRowsByIds } from "../../lib/database";
import { setNationalHolidays as setLocalNationalHolidays, getNationalHolidays as getLocalNationalHolidays } from "../../config/holidays";

export function HolidaysAdminView() {
  const [items, setItems] = useState<{ id?: string; date: string; label?: string }[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [labelInput, setLabelInput] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const rows = await listRows("libur_nasional");
        if (!mounted) return;
        if (rows.length > 0) {
          const mapped = rows.map((r) => ({ id: r.id, date: r.data.Tanggal || r.data.tanggal || "", label: r.data.Keterangan || r.data.keterangan_libur || "" }));
          setItems(mapped.filter((it) => it.date));
          setLocalNationalHolidays(mapped.filter((it) => it.date));
          return;
        }
      } catch (_e) {
        // ignore DB errors and fall back to local
      }
      // fallback to local storage
      setItems(getLocalNationalHolidays().map((it) => ({ date: it.date, label: it.label })));
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAdd = async () => {
    if (!dateInput) return;
    if (items.find((it) => it.date === dateInput)) return;
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

  return (
    <div>
      <h3>Kelola Libur Nasional</h3>
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex gap-2 align-items-center">
            <input type="date" className="form-control form-control-sm" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
            <input type="text" className="form-control form-control-sm" placeholder="Keterangan (opsional)" value={labelInput} onChange={(e) => setLabelInput(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>Tambah</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h5 className="mb-3">Daftar Libur</h5>
          {items.length === 0 ? (
            <div className="text-muted">Belum ada tanggal libur tersimpan.</div>
          ) : (
            <ul className="list-group">
              {items.map((it) => (
                <li key={it.date} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold">{it.date}</div>
                    {it.label ? <div className="text-muted small">{it.label}</div> : null}
                  </div>
                  <div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemove(it.date)}>Hapus</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
