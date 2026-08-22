import Select from "react-select";
import type { SelectOption, StatusState } from "../../types/app";

type TopToolbarProps = {
  activeKey: string;
  activeName: string;
  query: string;
  scheduleCabangOptions: string[];
  selectedScheduleCabang: string;
  allowAllCabang: boolean;
  monthOptions: Array<{ value: string; label: string }>;
  selectedMonthKey: string;
  selectedSuratTugasMonthKey: string;
  selectedSuratTugasKode: string;
  suratTugasPengajarOptions: SelectOption[];
  sheetStatus: StatusState;
  mapelStatus: StatusState;
  pengajarStatus: StatusState;
  suratTugasStatus: StatusState;
  penempatanStatus: StatusState;
  izinStatus: StatusState;
  permintaanStatus: StatusState;
  onQueryChange: (value: string) => void;
  onScheduleCabangChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onSuratMonthChange: (value: string) => void;
  onSuratKodeChange: (value: string) => void;
  topToolbarMessage?: string;
};

export function TopToolbar({
  activeKey,
  activeName,
  query,
  scheduleCabangOptions,
  selectedScheduleCabang,
  allowAllCabang,
  monthOptions,
  selectedMonthKey,
  selectedSuratTugasMonthKey,
  selectedSuratTugasKode,
  suratTugasPengajarOptions,
  sheetStatus,
  mapelStatus,
  pengajarStatus,
  suratTugasStatus,
  penempatanStatus,
  izinStatus,
  permintaanStatus,
  onQueryChange,
  onScheduleCabangChange,
  onMonthChange,
  onSuratMonthChange,
  onSuratKodeChange,
  topToolbarMessage,
}: TopToolbarProps) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div className="d-flex flex-wrap align-items-center gap-2">
        {activeKey === "bulanIni" && (
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ width: 220 }}>
              <span className="input-group-text bg-light text-primary border-end-0">
                <i className="bi bi-calendar3" />
              </span>
              <select
                className="form-select form-select-sm border-start-0 fw-semibold"
                value={selectedMonthKey}
                onChange={(event) => onMonthChange(event.target.value)}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group input-group-sm" style={{ width: 240 }}>
              <span className="input-group-text bg-light text-primary border-end-0">
                <i className="bi bi-geo-alt" />
              </span>
              <select
                className="form-select form-select-sm border-start-0 fw-semibold"
                value={selectedScheduleCabang}
                onChange={(event) => onScheduleCabangChange(event.target.value)}
              >
                {allowAllCabang ? <option value="">Semua cabang</option> : null}
                {scheduleCabangOptions.map((cabang) => (
                  <option key={cabang} value={cabang}>
                    {cabang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeKey === "monitoringKelas" && (
          <div className="input-group input-group-sm" style={{ width: 220 }}>
            <span className="input-group-text bg-light text-primary border-end-0">
              <i className="bi bi-calendar3" />
            </span>
            <select
              className="form-select form-select-sm border-start-0 fw-semibold"
              value={selectedMonthKey}
              onChange={(event) => onMonthChange(event.target.value)}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeKey === "jadwalTambahanPelayanan" && (
          <div className="input-group input-group-sm" style={{ width: 240 }}>
            <span className="input-group-text bg-light text-primary border-end-0">
              <i className="bi bi-geo-alt" />
            </span>
            <select
              className="form-select form-select-sm border-start-0 fw-semibold"
              value={selectedScheduleCabang}
              onChange={(event) => onScheduleCabangChange(event.target.value)}
            >
              {allowAllCabang ? <option value="">Semua cabang</option> : null}
              {scheduleCabangOptions.map((cabang) => (
                <option key={cabang} value={cabang}>
                  {cabang}
                </option>
              ))}
            </select>
          </div>
        )}

        {(activeKey === "mataPelajaran" || activeKey === "pengajar" || activeKey === "penempatanPengajar") && (
          <div className="input-group input-group-sm" style={{ width: 240 }}>
            <span className="input-group-text bg-light text-muted border-end-0">
              <i className="bi bi-search" />
            </span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={activeKey === "mataPelajaran" ? "Cari mata pelajaran..." : `Cari ${activeName.toLowerCase()}...`}
              className="form-control form-control-sm border-start-0"
            />
          </div>
        )}

        {activeKey === "suratTugasMengajar" && (
          <>
            <div className="input-group input-group-sm" style={{ width: 220 }}>
              <span className="input-group-text bg-light text-primary border-end-0">
                <i className="bi bi-calendar3" />
              </span>
              <select
                className="form-select form-select-sm border-start-0"
                value={selectedSuratTugasMonthKey}
                onChange={(event) => onSuratMonthChange(event.target.value)}
              >
                <option value="">Pilih bulan</option>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: 260 }}>
              <Select
                value={
                  selectedSuratTugasKode
                    ? suratTugasPengajarOptions.find((option) => option.value === selectedSuratTugasKode) || null
                    : null
                }
                onChange={(option) => onSuratKodeChange(option?.value || "")}
                options={suratTugasPengajarOptions}
                placeholder={selectedSuratTugasMonthKey ? "Filter nama pengajar" : "Pilih bulan dulu"}
                isClearable
                isSearchable
                isDisabled={!selectedSuratTugasMonthKey}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="absolute"
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
              />
            </div>
          </>
        )}

        {(activeKey === "bulanIni" ||
          activeKey === "jadwalTambahanPelayanan" ||
          activeKey === "monitoringKelas" ||
          activeKey === "printJadwal") &&
          sheetStatus.lastSync && (
            <div className="d-flex align-items-center gap-1 text-muted small ms-md-2">
              <i className="bi bi-check2-circle text-success" />
              <span>Sinkron: {sheetStatus.lastSync}</span>
              {topToolbarMessage ? (
                <span className="badge rounded-pill bg-info text-dark ms-1">
                  {topToolbarMessage}
                </span>
              ) : null}
            </div>
          )}
        {activeKey === "mataPelajaran" && mapelStatus.lastSync && (
          <span className="text-muted small">Terakhir sinkron: {mapelStatus.lastSync}</span>
        )}
        {activeKey === "pengajar" && pengajarStatus.lastSync && (
          <span className="text-muted small">Terakhir sinkron: {pengajarStatus.lastSync}</span>
        )}
        {activeKey === "penempatanPengajar" && penempatanStatus.lastSync && (
          <span className="text-muted small">Terakhir sinkron: {penempatanStatus.lastSync}</span>
        )}
        {activeKey === "izinPengajar" && izinStatus.lastSync && (
          <span className="text-muted small">Terakhir sinkron: {izinStatus.lastSync}</span>
        )}
        {activeKey === "permintaanPengajarAntarCabang" && permintaanStatus.lastSync && (
          <span className="text-muted small">Terakhir sinkron: {permintaanStatus.lastSync}</span>
        )}
        {activeKey === "suratTugasMengajar" && suratTugasStatus.lastSync && (
          <span className="text-muted small">Terakhir sinkron: {suratTugasStatus.lastSync}</span>
        )}
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        {(activeKey === "bulanIni" || activeKey === "jadwalTambahanPelayanan") && sheetStatus.saving && (
          <div className="d-flex align-items-center gap-1.5 text-primary small fw-semibold">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
            <span>Menyimpan ke Database...</span>
          </div>
        )}
      </div>
    </div>
  );
}
