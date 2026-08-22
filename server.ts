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
  { id: crypto.randomUUID(), mata_pelajaran: "Matematika", kode_mata_pelajaran: "MTK" },
  { id: crypto.randomUUID(), mata_pelajaran: "Bahasa Indonesia", kode_mata_pelajaran: "BIND" },
  { id: crypto.randomUUID(), mata_pelajaran: "Bahasa Inggris", kode_mata_pelajaran: "BING" },
  { id: crypto.randomUUID(), mata_pelajaran: "Fisika", kode_mata_pelajaran: "FIS" },
  { id: crypto.randomUUID(), mata_pelajaran: "Kimia", kode_mata_pelajaran: "KIM" },
  { id: crypto.randomUUID(), mata_pelajaran: "Biologi", kode_mata_pelajaran: "BIO" }
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

// Generic DB CRUD routes
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
    const newRow = {
      id: body.id || crypto.randomUUID(),
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
    const newRows = rows.map((r: any) => ({
      id: r.id || crypto.randomUUID(),
      ...r,
      created_at: r.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
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
