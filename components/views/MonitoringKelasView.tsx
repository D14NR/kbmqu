import type { MonitoringRow } from "../../types/app";

type MonitoringKelasViewProps = {
  loading: boolean;
  rows: MonitoringRow[];
};

export function MonitoringKelasView({ loading, rows }: MonitoringKelasViewProps) {
  return (
    <div className="table-responsive border rounded mt-4 table-sticky-wrapper">
      <table className="table table-bordered align-middle mb-0 table-sticky">
        <thead className="table-light">
          <tr>
            <th className="text-center" style={{ width: 60 }}>
              No
            </th>
            <th className="text-center text-nowrap">Kelas</th>
            <th className="text-center text-nowrap">Cabang</th>
            <th className="text-center">Mata Pelajaran</th>
            <th className="text-center text-nowrap" style={{ width: 90 }}>
              Jml Mapel
            </th>
            <th className="text-center text-nowrap" style={{ width: 90 }}>
              Jml Sesi
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="text-center text-muted py-4">
                Memuat data jadwal...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-muted py-4">
                Belum ada data jadwal untuk ditampilkan.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${row.cabang}-${row.kelas}`}>
                <td className="text-center">{index + 1}</td>
                <td className="fw-semibold">{row.kelas}</td>
                <td>{row.cabang}</td>
                <td>
                  {row.mapelList.length === 0 ? (
                    <span className="text-muted">-</span>
                  ) : (
                    row.mapelList.map((mapelLabel) => <div key={`${row.cabang}-${row.kelas}-${mapelLabel}`}>{mapelLabel}</div>)
                  )}
                </td>
                <td className="text-center">{row.jumlahMapel}</td>
                <td className="text-center">{row.totalSesi}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}