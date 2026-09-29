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
  onExport: (
    selectedGroupKey: string | "all",
    selectedMonth: string | "all",
    includeAdditional: boolean,
    dateRange?: { startDate?: string; endDate?: string }
  ) => void;
  isAdmin: boolean;
  getRecordCount?: (
    selectedGroupKey: string | "all",
    selectedMonth: string | "all",
    includeAdditional: boolean,
    dateRange?: { startDate?: string; endDate?: string }
  ) => number;
};

export const ExportClassModal: React.FC<ExportClassModalProps> = ({
  isOpen,
  onClose,
  classes,
  months,
  onExport,
  isAdmin,
  getRecordCount,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [includeAdditional, setIncludeAdditional] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<"month" | "dateRange">("month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setSelectedKey("all");
      setSelectedMonth("all");
      setIncludeAdditional(true);
      setFilterMode("month");
      setStartDate("");
      setEndDate("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeDateRange = filterMode === "dateRange" ? { startDate, endDate } : undefined;

  const recordCount = getRecordCount
    ? getRecordCount(selectedKey, selectedMonth, includeAdditional, activeDateRange)
    : undefined;

  const handleExport = () => {
    onExport(selectedKey, selectedMonth, includeAdditional, activeDateRange);
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
                <option value="all">-- Semua Kelas --</option>
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

              {/* Filter Mode Selector */}
              <label className="form-label fw-medium text-dark small mb-1.5 d-block">
                Filter Waktu / Tanggal
              </label>
              <div className="btn-group w-100 mb-2.5 p-1 bg-light rounded-3 border" role="group">
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 fw-medium transition-all ${
                    filterMode === "month"
                      ? "btn-white bg-white text-dark shadow-xs border"
                      : "btn-light text-muted border-0"
                  }`}
                  onClick={() => setFilterMode("month")}
                >
                  <i className="bi bi-calendar-month me-1.5 text-success" />
                  Berdasarkan Bulan
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-2 fw-medium transition-all ${
                    filterMode === "dateRange"
                      ? "btn-white bg-white text-dark shadow-xs border"
                      : "btn-light text-muted border-0"
                  }`}
                  onClick={() => setFilterMode("dateRange")}
                >
                  <i className="bi bi-calendar-range me-1.5 text-success" />
                  Rentang Tanggal Tertentu
                </button>
              </div>

              {/* View according to Filter Mode */}
              {filterMode === "month" ? (
                <div>
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
              ) : (
                <div className="p-3 bg-light rounded-3 border">
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label text-muted small fw-medium mb-1">
                        Dari Tanggal
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-sm bg-white border shadow-none"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-muted small fw-medium mb-1">
                        Sampai Tanggal
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-sm bg-white border shadow-none"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  {(startDate || endDate) && (
                    <div className="d-flex justify-content-between align-items-center mt-2.5 pt-1 border-top">
                      <span className="small text-muted" style={{ fontSize: "0.78rem" }}>
                        {startDate && endDate
                          ? `Rentang: ${startDate} s/d ${endDate}`
                          : startDate
                          ? `Mulai dari: ${startDate}`
                          : `Hingga: ${endDate}`}
                      </span>
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none text-danger p-0 small"
                        style={{ fontSize: "0.78rem" }}
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                      >
                        <i className="bi bi-x-circle me-1" />
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="form-check mt-3 bg-light p-2.5 rounded-3 border">
                <input
                  className="form-check-input ms-0 me-2"
                  type="checkbox"
                  id="includeAdditionalCheck"
                  checked={includeAdditional}
                  onChange={(e) => setIncludeAdditional(e.target.checked)}
                />
                <label className="form-check-label text-dark small fw-medium cursor-pointer" htmlFor="includeAdditionalCheck">
                  Gabungkan Jadwal Reguler & Jadwal Tambahan Pelayanan
                </label>
              </div>

              {recordCount !== undefined && (
                <div className="d-flex align-items-center justify-content-between p-2.5 px-3 bg-light rounded-3 border mt-3">
                  <div className="d-flex align-items-center gap-2 small text-muted">
                    <i className="bi bi-file-earmark-bar-graph text-success" />
                    <span>Jadwal yang akan diekspor:</span>
                  </div>
                  <span
                    className={`badge rounded-pill px-2.5 py-1.5 fw-semibold ${
                      recordCount > 0
                        ? "bg-success text-white"
                        : "bg-secondary text-white"
                    }`}
                  >
                    {recordCount} sesi
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer border-0 pt-0">
            <button type="button" className="btn btn-light rounded-pill px-4" onClick={onClose}>
              Batal
            </button>
            <button 
              type="button" 
              className="btn btn-success rounded-pill px-4 d-inline-flex align-items-center gap-2 shadow-sm" 
              onClick={handleExport}
              disabled={recordCount !== undefined && recordCount === 0}
            >
              <i className="bi bi-download" />
              Export {recordCount !== undefined && recordCount > 0 ? `(${recordCount})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
