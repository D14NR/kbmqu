import Select from "react-select";
import type { SelectOption, StatusState } from "../../types/app";

type TopToolbarProps = {
  activeKey: string;
  activeName: string;
  query: string;
  monthOptions: Array<{ value: string; label: string }>;
  selectedMonthKey: string;
  selectedSuratTugasMonthKey: string;
  selectedSuratTugasKode: string;
  suratTugasPengajarOptions: SelectOption[];
  sheetStatus: StatusState;
  mapelStatus: StatusState;
  pengajarStatus: StatusState;
  suratTugasStatus: StatusState;
  onQueryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onSuratMonthChange: (value: string) => void;
  onSuratKodeChange: (value: string) => void;
};

export function TopToolbar({
  activeKey,
  activeName,
  query,
  monthOptions,
  selectedMonthKey,
  selectedSuratTugasMonthKey,
  selectedSuratTugasKode,
  suratTugasPengajarOptions,
  sheetStatus,
  mapelStatus,
  pengajarStatus,
  suratTugasStatus,
  onQueryChange,
  onMonthChange,
  onSuratMonthChange,
  onSuratKodeChange,
}: TopToolbarProps) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div className="d-flex flex-wrap align-items-center gap-2">
        {(activeKey === "bulanIni" || activeKey === "monitoringKelas") && (
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

        {activeKey !== "suratTugasMengajar" && activeKey !== "printJadwal" && (
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
              />
            </div>
          </>
        )}

        {(activeKey === "bulanIni" ||
          activeKey === "jadwalTambahanPelayanan" ||
          activeKey === "monitoringKelas" ||
          activeKey === "printJadwal") &&
          sheetStatus.lastSync && <span className="text-muted small">Terakhir sinkron: {sheetStatus.lastSync}</span>}
        {activeKey === "mataPelajaran" && mapelStatus.lastSync && (
          <span className="text-muted small">Terakhir sinkron: {mapelStatus.lastSync}</span>
        )}
        {activeKey === "pengajar" && pengajarStatus.lastSync && (
          <span className="text-muted small">Terakhir sinkron: {pengajarStatus.lastSync}</span>
        )}
        {activeKey === "suratTugasMengajar" && suratTugasStatus.lastSync && (
          <span className="text-muted small">Terakhir sinkron: {suratTugasStatus.lastSync}</span>
        )}
      </div>

      {(activeKey === "bulanIni" || activeKey === "jadwalTambahanPelayanan") && sheetStatus.saving && (
        <span className="text-primary small fw-semibold">Menyimpan ke Google Sheet...</span>
      )}
    </div>
  );
}