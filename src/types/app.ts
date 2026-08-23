export type FieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  type?: string;
};

export type CategoryConfig = {
  key: string;
  name: string;
  icon: string;
  description: string;
  fields: FieldConfig[];
};

export type RecordItem = {
  id: string;
  // Standard string fields (cabang, kelas, mapel, pengajar, waktu, etc.)
  [key: string]: string | undefined | boolean | any;
  // Optional gabung metadata
  gabungWith?: string; // serialized key: "cabang||kelas||sekolah"
  isGabung?: boolean;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type EditingSlot = {
  cabang: string;
  kelas: string;
  sekolah?: string;
  jenjang?: string;
  classOrder?: number | string;
  tanggal: string;
  tanggalSheet: string;
  entryId?: string;
};

export type AuthSession = {
  username: string;
  roll: string;
  cabang: string;
};

export type StatusState = {
  loading: boolean;
  saving?: boolean;
  error: string;
  lastSync: string;
};

export type ScheduleSlotDate = {
  date: string;
  label: string;
};

export type ScheduleDayGroup = {
  label: string;
  count: number;
};

export type ScheduleGroup = {
  cabang: string;
  kelas: string;
  sekolah: string;
  jenjang?: string;
  classOrder: number;
  entriesByDate: Record<string, RecordItem[]>;
};

export type MonitoringRow = {
  cabang: string;
  kelas: string;
  mapelList: string[];
  jumlahMapel: number;
  totalSesi: number;
  mapelCountByKode: Record<string, number>;
};

export type ToastType = "success" | "error" | "info";

export type AppToast = {
  id: string;
  message: string;
  type: ToastType;
};