import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory database store
const dbStore = new Map<string, Array<Record<string, any>>>();

// Seed default data
dbStore.set("accounts_cabang", [
  { id: crypto.randomUUID(), username: "Admin", password: "dian290192", roll: "admin", cabang: "" },
  { id: crypto.randomUUID(), username: "semarang1", password: "443", roll: "cabang", cabang: "Semarang 1" },
  { id: crypto.randomUUID(), username: "semarang2", password: "444", roll: "cabang", cabang: "Semarang 2" },
  { id: crypto.randomUUID(), username: "kendal", password: "448", roll: "cabang", cabang: "Kendal" }
]);

dbStore.set("mata_pelajaran", [
  { id: crypto.randomUUID(), mata_pelajaran: "Matematika", kode_mata_pelajaran: "MTK", kategory: "UMUM" },
  { id: crypto.randomUUID(), mata_pelajaran: "Bahasa Indonesia", kode_mata_pelajaran: "BIND", kategory: "UMUM" },
  { id: crypto.randomUUID(), mata_pelajaran: "Bahasa Inggris", kode_mata_pelajaran: "BING", kategory: "UMUM" },
  { id: crypto.randomUUID(), mata_pelajaran: "Fisika", kode_mata_pelajaran: "FIS", kategory: "TKA" },
  { id: crypto.randomUUID(), mata_pelajaran: "Kimia", kode_mata_pelajaran: "KIM", kategory: "TKA" },
  { id: crypto.randomUUID(), mata_pelajaran: "Biologi", kode_mata_pelajaran: "BIO", kategory: "TKA" },
  { id: crypto.randomUUID(), mata_pelajaran: "Tes Potensi Skolastik", kode_mata_pelajaran: "TPS", kategory: "SNBT" },
  { id: crypto.randomUUID(), mata_pelajaran: "Tes Karakteristik Pribadi", kode_mata_pelajaran: "TKP", kategory: "KEDINASAN" }
]);

dbStore.set("pengajar", [
  { id: crypto.randomUUID(), kode_pengajar: "P01", nama_pengajar: "Pak Dimas", bidang_studi_mata_pelajaran: "Matematika", email: "dimas@kbmqu.test", no_whatsapp: "08123456789", domisili: "Semarang", username: "dimas", password_hash: "123456" },
  { id: crypto.randomUUID(), kode_pengajar: "P02", nama_pengajar: "Bu Siti", bidang_studi_mata_pelajaran: "Bahasa Indonesia", email: "siti@kbmqu.test", no_whatsapp: "08123456790", domisili: "Semarang", username: "siti", password_hash: "123456" }
]);

dbStore.set("jadwal_kbm", []);
dbStore.set("libur_nasional", []);
dbStore.set("surat_tugas_pengajar", []);
dbStore.set("penempatan_pengajar_dicabang", []);
dbStore.set("izin_pengajar", []);
dbStore.set("permintaan_pengajar_antar_cabang", []);
dbStore.set("donasi", [
  {
    id: crypto.randomUUID(),
    nama_pemilik: "Dian Rizki Sofiawan",
    nama_bank: "Bank Jago",
    alamat_rekening: "109760181905",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    nama_pemilik: "Dian Rizki Sofiawan",
    nama_bank: "PayPal",
    alamat_rekening: "dianrizkisofiawan9@gmail.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    nama_pemilik: "Dian Rizki Sofiawan",
    nama_bank: "ShopeePay",
    alamat_rekening: "08999990431",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]);
dbStore.set("donasi_transaksi", [
  {
    id: 1,
    nama_pengirim: "Hamba Allah",
    tanggal: "2026-09-01",
    jumlah_transaksi_masuk: 100000,
    jumlah_transaksi_keluar: 0,
    keterangan: "donasi masuk",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    nama_pengirim: "Alumni Pengajar",
    tanggal: "2026-09-02",
    jumlah_transaksi_masuk: 250000,
    jumlah_transaksi_keluar: 0,
    keterangan: "donasi masuk",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    nama_pengirim: "Cloudflare D1 & Host",
    tanggal: "2026-09-03",
    jumlah_transaksi_masuk: 0,
    jumlah_transaksi_keluar: 50000,
    keterangan: "pemeliharaan database & server",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]);

const getTableRows = (table: string) => {
  if (!dbStore.has(table)) {
    dbStore.set(table, []);
  }
  return dbStore.get(table)!;
};

// API Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Proxy middleware to Cloudflare Worker if VITE_API_URL is set
app.use("/db", async (req, res, next) => {
  const remoteUrl = process.env.VITE_API_URL || "https://db-kbmqu.dianrizkisofiawan0431.workers.dev";
  if (!remoteUrl) {
    return next(); // Fallback to in-memory store
  }

  try {
    let baseUrl = remoteUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (!/^https?:\/\//i.test(baseUrl)) {
      baseUrl = `https://${baseUrl}`;
    }

    const targetUrl = `${baseUrl}/db${req.url}`;
    
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    const remoteRes = await fetch(targetUrl, fetchOptions);
    const data = await remoteRes.text();
    
    res.status(remoteRes.status);
    remoteRes.headers.forEach((val, key) => {
      // Avoid forwarding content-encoding to prevent double compression issues
      if (key.toLowerCase() !== 'content-encoding') {
         res.setHeader(key, val);
      }
    });
    res.send(data);
  } catch (error: any) {
    console.error("Remote DB Proxy Error:", error);
    res.status(502).json({ success: false, message: "Gagal menghubungi remote database: " + error.message });
  }
});

// Generic DB CRUD routes (In-Memory Fallback)
app.get("/db/:table", (req, res) => {
  try {
    const table = req.params.table;
    const rows = getTableRows(table);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/db/:table/:id", (req, res) => {
  try {
    const { table, id } = req.params;
    const rows = getTableRows(table);
    const row = rows.find((r) => String(r.id) === String(id));
    if (!row) {
      return res.status(404).json({ success: false, message: "Data tidak ditemukan." });
    }
    res.json({ success: true, data: row });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/db/:table", (req, res) => {
  try {
    const table = req.params.table;
    const rows = getTableRows(table);
    const body = req.body || {};
    
    // Auto-increment logic for donasi_transaksi, UUID for others
    let newId = body.id;
    if (!newId) {
      if (table === 'donasi_transaksi') {
        const maxId = rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
        newId = maxId + 1;
      } else {
        newId = crypto.randomUUID();
      }
    }

    const newRow = {
      id: newId,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    rows.push(newRow);
    res.status(201).json({ success: true, message: "Data berhasil ditambahkan.", data: newRow });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/db/:table/:id", (req, res) => {
  try {
    const { table, id } = req.params;
    const rows = getTableRows(table);
    const index = rows.findIndex((r) => String(r.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Data tidak ditemukan." });
    }
    const body = req.body || {};
    const updatedRow = {
      ...rows[index],
      ...body,
      id,
      updated_at: new Date().toISOString()
    };
    rows[index] = updatedRow;
    res.json({ success: true, message: "Data berhasil diperbarui.", data: updatedRow });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/db/:table/:id", (req, res) => {
  try {
    const { table, id } = req.params;
    const rows = getTableRows(table);
    const index = rows.findIndex((r) => String(r.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Data tidak ditemukan." });
    }
    const [deleted] = rows.splice(index, 1);
    res.json({ success: true, message: "Data berhasil dihapus.", data: deleted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/db/:table/delete", (req, res) => {
  try {
    const table = req.params.table;
    const rows = getTableRows(table);
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: "Format ids tidak valid." });
    }
    const idSet = new Set(ids.map(String));
    const initialLen = rows.length;
    const filtered = rows.filter((r) => !idSet.has(String(r.id)));
    dbStore.set(table, filtered);
    const deletedCount = initialLen - filtered.length;
    res.json({ success: true, message: "Data berhasil dihapus.", deleted: deletedCount, ids });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/db/:table/replace", (req, res) => {
  try {
    const table = req.params.table;
    const { rows } = req.body || {};
    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: "Format rows tidak valid." });
    }
    const newRows = rows.map((r: any, idx: number) => {
      let newId = r.id;
      if (!newId) {
        if (table === 'donasi_transaksi') {
          const currentMaxId = dbStore.get(table)?.reduce((max: number, row: any) => Math.max(max, Number(row.id) || 0), 0) || 0;
          newId = currentMaxId + idx + 1;
        } else {
          newId = crypto.randomUUID();
        }
      }
      return {
        id: newId,
        ...r,
        created_at: r.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    dbStore.set(table, newRows);
    res.status(201).json({ success: true, message: "Data berhasil diganti.", data: newRows, count: newRows.length });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
