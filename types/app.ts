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
  [key: string]: string;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type EditingSlot = {
  cabang: string;
  kelas: string;
  sekolah?: string;
  tanggal: string;
  tanggalSheet: string;
  entryId?: string;
};

export type AuthSession = {
  username: string;
  role: string;
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
  entriesByDate: Record<string, RecordItem[]>;
};

export type MonitoringRow = {
  cabang: string;
  kelas: string;
  mapelList: string[];
  jumlahMapel: number;
  totalSesi: number;
};