import React, { useState, useEffect } from "react";

type ClassGroup = {
  cabang: string;
  kelas: string;
  sekolah: string;
};

type ExportClassModalProps = {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassGroup[];
  months: { value: string; label: string }[];
  onExport: (selectedGroupKey: string | "all", selectedMonth: string | "all") => void;
  isAdmin: boolean;
};

export const ExportClassModal: React.FC<ExportClassModalProps> = ({
  isOpen,
  onClose,
  classes,
  months,
  onExport,
  isAdmin,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(selectedKey, selectedMonth);
  };

  return (
    <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-excel text-success" />
              Export Jadwal ke Excel
            </h5>
            <button type="button" className="btn-close shadow-none" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body p-4">
            <div className="mb-3">
              <label className="form-label fw-medium text-dark small">Pilih Kelas</label>
              <select
                className="form-select bg-light border-0 shadow-none px-3 py-2 text-sm mb-3"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
              >
                {isAdmin && <option value="all">-- Semua Kelas --</option>}
                {!isAdmin && <option value="all" disabled>-- Pilih Kelas --</option>}
                {classes.map((c) => {
                  const key = `${c.cabang}||${c.kelas}||${c.sekolah}`;
                  const label = `${c.kelas} ${c.sekolah ? `(${c.sekolah})` : ""} - ${c.cabang}`;
                  return (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <label className="form-label fw-medium text-dark small">Pilih Bulan</label>
              <select
                className="form-select bg-light border-0 shadow-none px-3 py-2 text-sm"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all">-- Semua Bulan --</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer border-0 pt-0">
            <button type="button" className="btn btn-light rounded-pill px-4" onClick={onClose}>
              Batal
            </button>
            <button 
              type="button" 
              className="btn btn-success rounded-pill px-4 d-inline-flex align-items-center gap-2" 
              onClick={handleExport}
              disabled={!isAdmin && selectedKey === "all"}
            >
              <i className="bi bi-download" />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
