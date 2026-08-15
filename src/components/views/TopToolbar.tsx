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
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 220 }}
              value={selectedMonthKey}
              onChange={(event) => onMonthChange(event.target.value)}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ minWidth: 220, maxWidth: 280 }}
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

        {activeKey === "monitoringKelas" && (
          <select
            className="form-select form-select-sm"
            style={{ maxWidth: 220 }}
            value={selectedMonthKey}
            onChange={(event) => onMonthChange(event.target.value)}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {activeKey === "jadwalTambahanPelayanan" && (
          <select
            className="form-select form-select-sm"
            style={{ maxWidth: 220 }}
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
        )}

        {(activeKey === "mataPelajaran" || activeKey === "pengajar" || activeKey === "penempatanPengajar") && (
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={activeKey === "mataPelajaran" ? "Cari mata pelajaran..." : `Cari ${activeName.toLowerCase()}...`}
            className="form-control form-control-sm"
            style={{ maxWidth: 240 }}
          />
        )}

        {activeKey === "suratTugasMengajar" && (
          <>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 220 }}
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
            <span className="text-muted small">
              Terakhir sinkron: {sheetStatus.lastSync}
              {topToolbarMessage ? (
                <span className="badge rounded-pill bg-info text-dark ms-2">
                  {topToolbarMessage}
                </span>
              ) : null}
            </span>
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
        {/* Copy to next month removed */}
        
        {(activeKey === "bulanIni" || activeKey === "jadwalTambahanPelayanan") && sheetStatus.saving && (
          <span className="text-primary small fw-semibold">Menyimpan ke Database...</span>
        )}
      </div>
    </div>
  );
}