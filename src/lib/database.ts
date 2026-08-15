import { apiFetch } from "./api";
import { formatLocalDate, parseFlexibleDate } from "../utils/schedule";

export type DbRow = {
  id: string;
  data: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

const bucketTableMap = {
  jadwal_reguler: "jadwal_kbm",
  jadwal_khusus: "jadwal_kbm",
  jadwal_kbm: "jadwal_kbm",
  mata_pelajaran: "mata_pelajaran",
  pengajar: "pengajar",
  accounts_cabang: "accounts_cabang",
  surat_tugas: "surat_tugas_pengajar",
  penempatan_pengajar_dicabang: "penempatan_pengajar_dicabang",
  izin_pengajar: "izin_pengajar",
  permintaan_pengajar: "permintaan_pengajar_antar_cabang",
  libur_nasional: "libur_nasional",
} as const;

type BucketName = keyof typeof bucketTableMap;

type BucketSchema = {
  table: string;
  fromDb: (row: Record<string, unknown>) => Record<string, string>;
  toDb: (data: Record<string, string>) => Record<string, string | number | boolean | null>;
};

const encodeId = (bucket: string, id: string) => `${bucket}:${id}`;

export const decodeId = (encoded: string) => {
  const [bucket, ...rest] = String(encoded || "").split(":");
  const id = rest.join(":");
  if (!bucket || !id || !(bucket in bucketTableMap)) {
    throw new Error("ID database tidak valid.");
  }
  return { bucket: bucket as BucketName, id };
};

const asString = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);

const asNumberOrNull = (value: unknown) => {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const asBoolean = (value: unknown) => {
  if (value === undefined || value === null) return false;
  const raw = String(value).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "t" || raw === "yes" || raw === "y";
};

const asBooleanInt = (value: unknown) => (asBoolean(value) ? 1 : 0);

const asTimestampOrNull = (value: unknown) => {
  if (value === undefined || value === null) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const normalizeAvailabilityEntries = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const entry = item as Record<string, unknown>;
        const hari = String(entry.hari ?? entry.Hari ?? "").trim();
        if (!hari) {
          return null;
        }
        const jamMulai = String(entry.jamMulai ?? entry.jam_mulai ?? "").trim();
        const jamSelesai = String(entry.jamSelesai ?? entry.jam_selesai ?? "").trim();
        const cabangList = Array.isArray(entry.cabangList)
          ? entry.cabangList.map((cabang) => String(cabang ?? "").trim()).filter(Boolean)
          : String(entry.cabangList ?? entry.cabang_penempatan ?? "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
        return {
          hari,
          jamMulai,
          jamSelesai,
          cabangList,
        };
      })
      .filter((item): item is { hari: string; jamMulai: string; jamSelesai: string; cabangList: string[] } => Boolean(item));
  }

  if (typeof value === "string") {
    try {
      return normalizeAvailabilityEntries(JSON.parse(value));
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const normalizeDbDate = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  const parsed = parseFlexibleDate(raw);
  return parsed ? formatLocalDate(parsed) : raw;
};

const extractMonthValue = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  const parsed = parseFlexibleDate(raw);
  if (parsed) {
    return `${parsed.getFullYear().toString().padStart(4, "0")}-${(parsed.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
  }
  return raw.slice(0, 7);
};

const jadwalKbmSchema: BucketSchema = {
  table: bucketTableMap.jadwal_kbm,
  fromDb: (row) => ({
    Cabang: asString(row.cabang),
    Kelas: asString(row.kelas),
    Sekolah: asString(row.sekolah),
    "Jenjang Studi": asString((row as any).jenjang_studi),
    jenjang: asString((row as any).jenjang_studi),
    Tanggal: asString(row.tanggal),
    Bulan: asString(row.bulan),
    bulan: asString(row.bulan),
    Mapel: asString((row as any).mata_pelajaran),
    Pengajar: asString((row as any).kode_pengajar || (row as any).nama_pengajar),
    "Kode Pengajar": asString((row as any).kode_pengajar),
    "Nama Pengajar": asString((row as any).nama_pengajar),
    Waktu: asString(row.waktu),
    "Urutan Kelas": asString(row.class_order),
    Gabung: asString((row as any).gabung),
    IsGabung: asString((row as any).is_gabung),
    "Jenis KBM": asString((row as any).jenis_kbm),
    jenis_kbm: asString((row as any).jenis_kbm),
  }),
  toDb: (data) => ({
    cabang: asString(data.Cabang),
    kelas: asString(data.Kelas),
    sekolah: asString(data.Sekolah),
    jenjang_studi: asString((data as any)["Jenjang Studi"] || (data as any).jenjang || (data as any).jenjang_studi),
    tanggal: asString(data.Tanggal),
    bulan: extractMonthValue(data.Bulan || data.Tanggal),
    mata_pelajaran: asString(data.Mapel),
    kode_pengajar: asString((data as any)["Kode Pengajar"] || data.Pengajar),
    nama_pengajar: asString((data as any)["Nama Pengajar"] || (data as any).Nama || ""),
    waktu: asString(data.Waktu),
    class_order: asNumberOrNull(data["Urutan Kelas"]),
    gabung: asString((data as any).Gabung || (data as any).gabung),
    jenis_kbm: asString((data as any)["Jenis KBM"] || (data as any).jenis_kbm || "Reguler"),
    is_gabung: asBooleanInt((data as any).IsGabung || (data as any).is_gabung || (data as any).isGabung),
  }),
};

const schemas: Record<BucketName, BucketSchema> = {
  jadwal_reguler: jadwalKbmSchema,
  jadwal_khusus: jadwalKbmSchema,
  jadwal_kbm: jadwalKbmSchema,
  mata_pelajaran: {
    table: bucketTableMap.mata_pelajaran,
    fromDb: (row) => ({
      Mapel: asString(row.mata_pelajaran),
      Kode_Mapel: asString(row.kode_mata_pelajaran),
    }),
    toDb: (data) => ({
      mata_pelajaran: asString(data.Mapel),
      kode_mata_pelajaran: asString(data.Kode_Mapel),
    }),
  },
  pengajar: {
    table: bucketTableMap.pengajar,
    fromDb: (row) => ({
      "Kode Pengajar": asString(row.kode_pengajar),
      Nama: asString(row.nama_pengajar || row.nama),
      "Nama Pengajar": asString(row.nama_pengajar || row.nama),
      "Bidang Studi": asString(row.bidang_studi_mata_pelajaran),
      Email: asString(row.email),
      "No.WhatsApp": asString(row.no_whatsapp),
      Domisili: asString(row.domisili),
      Username: asString(row.username),
      Password: asString(row.password_hash),
    }),
    toDb: (data) => ({
      kode_pengajar: asString(data["Kode Pengajar"]),
      nama_pengajar: asString(data.Nama || data["Nama Pengajar"]),
      bidang_studi_mata_pelajaran: asString(data["Bidang Studi"]),
      email: asString(data.Email),
      no_whatsapp: asString(data["No.WhatsApp"]),
      domisili: asString(data.Domisili),
      username: asString(data.Username),
      password_hash: asString(data.Password),
    }),
  },
  accounts_cabang: {
    table: bucketTableMap.accounts_cabang,
    fromDb: (row) => ({
      Username: asString(row.username),
      Password: asString(row.password),
      Roll: asString(row.roll),
      Cabang: asString(row.cabang),
      "Created At": asString((row as any).created_at),
      "Updated At": asString((row as any).updated_at),
    }),
    toDb: (data) => ({
      username: asString(data.Username),
      password: asString(data.Password),
      roll: asString(data.Roll),
      cabang: asString(data.Cabang),
    }),
  },
  surat_tugas: {
    table: bucketTableMap.surat_tugas,
    fromDb: (row) => ({
      "Kode Pengajar": asString(row.kode_pengajar),
      Tanggal: asString(row.tanggal),
      "Sesi 1": asString(row.sesi_1),
      "Sesi 2": asString(row.sesi_2),
      "Sesi 3": asString(row.sesi_3),
      "Sesi 4": asString(row.sesi_4),
      "Sesi 5": asString(row.sesi_5),
      "Sesi 6": asString(row.sesi_6),
      "Sesi 7": asString(row.sesi_7),
      "Sesi 8": asString(row.sesi_8),
      "Sesi 9": asString(row.sesi_9),
      "Sesi 10": asString(row.sesi_10),
    }),
    toDb: (data) => ({
      kode_pengajar: asString(data["Kode Pengajar"]),
      tanggal: normalizeDbDate(data.Tanggal),
      sesi_1: asString(data["Sesi 1"]),
      sesi_2: asString(data["Sesi 2"]),
      sesi_3: asString(data["Sesi 3"]),
      sesi_4: asString(data["Sesi 4"]),
      sesi_5: asString(data["Sesi 5"]),
      sesi_6: asString(data["Sesi 6"]),
      sesi_7: asString(data["Sesi 7"]),
      sesi_8: asString(data["Sesi 8"]),
      sesi_9: asString(data["Sesi 9"]),
      sesi_10: asString(data["Sesi 10"]),
    }),
  },
  libur_nasional: {
    table: "libur_nasional",
    fromDb: (row) => ({
      ID: asString(row.id),
      Tanggal: asString(row.tanggal),
      Keterangan: asString(row.keterangan_libur),
    }),
    toDb: (data) => ({
      id: asString(data.ID),
      tanggal: normalizeDbDate(data.Tanggal),
      keterangan_libur: asString(data.Keterangan),
    }),
  },
  penempatan_pengajar_dicabang: {
    table: bucketTableMap.penempatan_pengajar_dicabang,
    fromDb: (row) => {
      const raw = row as Record<string, unknown>;
      return {
        "Kode Pengajar": asString(raw.kode_pengajar),
        "Nama Pengajar": asString(raw.nama_pengajar),
        Domisili: asString(raw.domisili),
        Hari: asString(raw.hari_tersedia),
        "Jam Mulai": asString(raw.jam_mulai),
        "Jam Selesai": asString(raw.jam_selesai),
        "Cabang Penempatan": asString(raw.bersedia_mengajar_dicabang),
        "__id_pengajar": asString(raw.id_pengajar),
      };
    },
    toDb: (data) => {
      const rawData = data as Record<string, unknown>;
      const hariTersedia = asString(rawData.Hari ?? rawData.hari_tersedia);
      const jamMulai = asString(rawData["Jam Mulai"] ?? rawData.jam_mulai);
      const jamSelesai = asString(rawData["Jam Selesai"] ?? rawData.jam_selesai);
      const cabangPenempatan = asString(rawData["Cabang Penempatan"] ?? rawData.bersedia_mengajar_dicabang);

      return {
        id_pengajar: asString(rawData["__id_pengajar"] ?? rawData.id_pengajar),
        kode_pengajar: asString(rawData["Kode Pengajar"] ?? rawData.kode_pengajar),
        nama_pengajar: asString(rawData["Nama Pengajar"] ?? rawData.nama_pengajar),
        domisili: asString(rawData.Domisili ?? rawData.domisili),
        hari_tersedia: hariTersedia,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        bersedia_mengajar_dicabang: cabangPenempatan,
      };
    },
  },
  izin_pengajar: {
    table: bucketTableMap.izin_pengajar,
    fromDb: (row) => ({
      ID: asString(row.id),
      "Kode Pengajar": asString(row.kode_pengajar),
      "Nama Pengajar": asString(row.nama_pengajar),
      Domisili: asString(row.domisili),
      "Cabang Target": asString(row.cabang_target),
      "Tanggal Mulai": asString(row.tanggal_mulai),
      "Tanggal Selesai": asString(row.tanggal_selesai),
      Keterangan: asString(row.keterangan),
      "Keterangan Status": asString(row.status ?? row.keterangan_status),
      "Diputuskan Oleh": asString(row.diputuskan_oleh),
      "Diputuskan Pada": asString(row.diputuskan_pada),
    }),
    toDb: (data) => ({
      kode_pengajar: asString(data["Kode Pengajar"]),
      nama_pengajar: asString(data["Nama Pengajar"]),
      domisili: asString(data.Domisili),
      cabang_target: asString(data["Cabang Target"]),
      tanggal_mulai: normalizeDbDate(data["Tanggal Mulai"]),
      tanggal_selesai: normalizeDbDate(data["Tanggal Selesai"]),
      keterangan: asString(data.Keterangan),
      status: asString(data["Status"] || data["Keterangan Status"] || "Menunggu"),
      diputuskan_oleh: asString(data["Diputuskan Oleh"]),
      diputuskan_pada: asTimestampOrNull(
        data["Diputuskan Pada Raw"] || data["Diputuskan Pada"]
      ),
    }),
  },
  permintaan_pengajar: {
    table: bucketTableMap.permintaan_pengajar,
    fromDb: (row) => ({
      ID: asString(row.id),
      "Kode Pengajar": asString(row.kode_pengajar),
      "Nama Pengajar": asString(row.nama_pengajar),
      "Dari Cabang": asString(row.dari_cabang),
      "Cabang Peminta": asString(row.cabang_peminta),
      "Tanggal Diminta": asString(row.tanggal_diminta),
      "Jam Mulai": asString(row.jam_mulai),
      "Jam Selesai": asString(row.jam_selesai),
      Status: asString(row.status),
      Catatan: asString(row.catatan),
      "Created At": asString(row.created_at),
      "Updated At": asString(row.updated_at),
    }),
    toDb: (data) => ({
      kode_pengajar: asString(data["Kode Pengajar"]),
      nama_pengajar: asString(data["Nama Pengajar"]),
      dari_cabang: asString(data["Dari Cabang"]),
      cabang_peminta: asString(data["Cabang Peminta"]),
      tanggal_diminta: normalizeDbDate(data["Tanggal Diminta"]),
      jam_mulai: asString(data["Jam Mulai"]),
      jam_selesai: asString(data["Jam Selesai"]),
      status: asString(data.Status || "Menunggu"),
      catatan: asString(data.Catatan),
    }),
  },
};

const normalizeData = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return {} as Record<string, string>;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, item]) => {
      acc[key] = item === undefined || item === null ? "" : String(item);
      return acc;
    },
    {}
  );
};

const apiRequest = async <T>(path: string, method: string = "GET", body?: unknown) => {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  return apiFetch<T>(path, init);
};

const getDbRow = async (table: string, rawId: string) => {
  return apiRequest<Record<string, unknown>>(`/db/${table}/${encodeURIComponent(rawId)}`);
};

export const listRows = async (bucket: string) => {
  if (!(bucket in schemas)) {
    throw new Error(`Bucket tidak dikenal: ${bucket}`);
  }
  const schema = schemas[bucket as BucketName];
  const data = await apiRequest<any[]>(`/db/${schema.table}`);

  const rows = (data || []).map((row) => ({
    id: encodeId(bucket, String(row.id || "")),
    data: normalizeData(schema.fromDb(row as Record<string, unknown>)),
    createdAt: asString((row as Record<string, unknown>).created_at),
    updatedAt: asString((row as Record<string, unknown>).updated_at),
  })) as DbRow[];

  if (bucket === "jadwal_reguler") {
    return rows.filter((row) => normalizeValueKey(row.data["Jenis KBM"] || row.data.jenis_kbm || "") === "reguler");
  }

  if (bucket === "jadwal_khusus") {
    return rows.filter((row) => normalizeValueKey(row.data["Jenis KBM"] || row.data.jenis_kbm || "") === "khusus");
  }

  return rows;
};

export const insertRow = async (bucket: string, data: Record<string, string>) => {
  if (!(bucket in schemas)) {
    throw new Error(`Bucket tidak dikenal: ${bucket}`);
  }
  const schema = schemas[bucket as BucketName];
  const inserted = await apiRequest<Record<string, unknown>>(
    `/db/${schema.table}`,
    "POST",
    schema.toDb(data)
  );

  return {
    id: encodeId(bucket, String(inserted.id || "")),
    data: normalizeData(schema.fromDb(inserted)),
  } as DbRow;
};

export const updateRow = async (id: string, data: Record<string, string>) => {
  const { bucket, id: rawId } = decodeId(id);
  const schema = schemas[bucket];
  const existing = await getDbRow(schema.table, rawId);

  const mergedInput = {
    ...normalizeData(schema.fromDb(existing as Record<string, unknown>)),
    ...normalizeData(data),
  };

  const updated = await apiRequest<Record<string, unknown>>(
    `/db/${schema.table}/${encodeURIComponent(rawId)}`,
    "PUT",
    schema.toDb(mergedInput)
  );

  return {
    id: encodeId(bucket, String(updated.id || "")),
    data: normalizeData(schema.fromDb(updated)),
  } as DbRow;
};

export const deleteRowsByIds = async (ids: string[]) => {
  if (ids.length === 0) {
    return;
  }

  const grouped = ids.reduce<Record<string, string[]>>((acc, id) => {
    const decoded = decodeId(id);
    if (!acc[decoded.bucket]) {
      acc[decoded.bucket] = [];
    }
    acc[decoded.bucket].push(decoded.id);
    return acc;
  }, {});

  for (const [bucket, rawIds] of Object.entries(grouped)) {
    const schema = schemas[bucket as BucketName];
    await apiRequest(`/db/${schema.table}/delete`, "POST", { ids: rawIds });
  }
};

export const replaceBucketRows = async (bucket: string, records: Record<string, string>[]) => {
  if (!(bucket in schemas)) {
    throw new Error(`Bucket tidak dikenal: ${bucket}`);
  }
  const schema = schemas[bucket as BucketName];
  const existing = await listRows(bucket);
  await deleteRowsByIds(existing.map((row) => row.id));
  if (records.length === 0) {
    return;
  }

  const payload = records.map((record) => schema.toDb(record));
  await apiRequest(`/db/${schema.table}/replace`, "POST", { rows: payload });
};
