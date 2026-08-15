import type { CategoryConfig, RecordItem } from "../types/app";

export const categories: CategoryConfig[] = [
  {
    key: "bulanIni",
    name: "Jadwal Reguler",
    icon: "bi-calendar-week",
    description: "",
    fields: [
      { key: "cabang", label: "Cabang", placeholder: "Semarang 1" },
      { key: "kelas", label: "Kelas", placeholder: "PIKPU-1" },
      { key: "tanggal", label: "Tanggal", type: "date" },
      { key: "mapel", label: "Mata Pelajaran", placeholder: "Matematika" },
      { key: "pengajar", label: "Pengajar", placeholder: "Pak Dimas" },
      { key: "waktu", label: "Waktu", placeholder: "08:00 - 09:30" },
      { key: "catatan", label: "Catatan", placeholder: "Ujian Bab 2" },
    ],
  },
  {
    key: "jadwalTambahanPelayanan",
    name: "Jadwal Tambahan & Pelayanan",
    icon: "bi-calendar-plus",
    description: "",
    fields: [
      { key: "cabang", label: "Cabang", placeholder: "Semarang 1" },
      { key: "kelas", label: "Kelas", placeholder: "PIKPU-1" },
      { key: "tanggal", label: "Tanggal", type: "date" },
      { key: "mapel", label: "Mata Pelajaran", placeholder: "Matematika" },
      { key: "pengajar", label: "Pengajar", placeholder: "Pak Dimas" },
      { key: "waktu", label: "Waktu", placeholder: "08:00 - 09:30" },
      { key: "catatan", label: "Catatan", placeholder: "Ujian Bab 2" },
    ],
  },
  {
    key: "printJadwal",
    name: "Print Jadwal",
    icon: "bi-printer",
    description: "",
    fields: [],
  },
  {
    key: "monitoringKelas",
    name: "Monitoring Kelas",
    icon: "bi-clipboard-data",
    description: "",
    fields: [],
  },
  {
    key: "suratTugasMengajar",
    name: "Surat Tugas Mengajar",
    icon: "bi-file-earmark-text",
    description: "",
    fields: [],
  },
  {
    key: "mataPelajaran",
    name: "Mata Pelajaran",
    icon: "bi-journal-text",
    description: "",
    fields: [],
  },
  {
    key: "pengajar",
    name: "Pengajar",
    icon: "bi-person-badge",
    description: "",
    fields: [],
  },
];

export const initialRecords: Record<string, RecordItem[]> = {
  bulanIni: [],
};