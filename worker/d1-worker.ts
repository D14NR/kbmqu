const allowedTables = new Set([
  "pengajar",
  "accounts_cabang",

  "mata_pelajaran",
  "sekolah",
  "kelompok_kelas",
  "data_siswa",

  "jadwal_kbm",
  "libur_nasional",

  "izin_pengajar",
  "permintaan_pengajar_antar_cabang",
  "permintaan_pelayanan",

  "perkembangan_belajar",
  "pesan_pembelajaran",
  "riwayat_pelayanan_siswa",

  "nilai_evaluasi",
  "nilai_standar",
  "nilai_standar_TKA_SD",
  "nilai_snbt",

  "subscriptions_pengajar",
  "subscriptions_siswa",

  "riwayat_notifikasi_pengajar",
  "riwayat_notifikasi_siwa",

  "informasi_sistem",

  "surat_tugas_pengajar",
  "penempatan_pengajar_dicabang",
]);


const jsonResponse = (body, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type",
    },
  });
};


const errorResponse = (message, status = 400) => {
  return jsonResponse(
    {
      success: false,
      message,
    },
    status
  );
};


const quoteIdent = (value) => {
  return `"${value.replace(/"/g, '""')}"`;
};


const normalizeTable = (table) => {
  if (!allowedTables.has(table)) {
    throw new Error(
      `Tabel "${table}" tidak diizinkan.`
    );
  }

  return table;
};


const execute = async (
  env,
  sql,
  params = []
) => {
  const result = await env.DB
    .prepare(sql)
    .bind(...params)
    .all();

  return result.results ?? [];
};


const parseJsonBody = async (request) => {
  try {
    const body = await request.json();

    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body;
  } catch {
    return null;
  }
};


const buildInsertSql = (table, row) => {
  const normalizedRow = { ...row };

  if (!normalizedRow.id) {
    normalizedRow.id = crypto.randomUUID();
  }

  const columns = Object.keys(normalizedRow);

  if (columns.length === 0) {
    throw new Error(
      "Data baris kosong tidak diizinkan."
    );
  }

  const columnsSql = columns
    .map(quoteIdent)
    .join(", ");

  const placeholders = columns
    .map(() => "?")
    .join(", ");

  return {
    sql: `
      INSERT INTO ${quoteIdent(table)}
      (${columnsSql})
      VALUES (${placeholders})
      RETURNING *
    `,
    values: columns.map(
      (key) => normalizedRow[key]
    ),
  };
};


const buildUpdateSql = (table, row) => {
  const id = row.id;

  if (!id) {
    throw new Error(
      "ID wajib disertakan."
    );
  }

  const columns = Object.keys(row)
    .filter(
      (column) => column !== "id"
    );

  if (columns.length === 0) {
    throw new Error(
      "Tidak ada data yang diperbarui."
    );
  }

  const setClause = columns
    .map(
      (column) =>
        `${quoteIdent(column)} = ?`
    )
    .join(", ");

  return {
    sql: `
      UPDATE ${quoteIdent(table)}
      SET ${setClause}
      WHERE id = ?
      RETURNING *
    `,
    values: [
      ...columns.map(
        (column) => row[column]
      ),
      id,
    ],
  };
};


export default {
  async fetch(request, env) {

    // ========================================================
    // CORS
    // ========================================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type",
          "Access-Control-Max-Age":
            "86400",
        },
      });
    }


    // ========================================================
    // URL
    // ========================================================

    const url = new URL(request.url);

    const path = url.pathname
      .replace(/\/+/g, "/")
      .replace(/\/$/, "");

    const segments = path
      .split("/")
      .filter(Boolean);


    // ========================================================
    // ROOT
    // ========================================================

    if (segments.length === 0) {
      return jsonResponse({
        success: true,
        message:
          "Cloudflare D1 Worker API aktif.",
        database: "D1",
        version: "1.0.0",
      });
    }


    // ========================================================
    // HARUS /db
    // ========================================================

    if (segments[0] !== "db") {
      return errorResponse(
        "Endpoint tidak ditemukan.",
        404
      );
    }


    // ========================================================
    // NAMA TABEL
    // ========================================================

    const table = segments[1];

    if (!table) {
      return errorResponse(
        "Nama tabel harus disertakan.",
        400
      );
    }


    try {
      normalizeTable(table);


      // ======================================================
      // GET SEMUA DATA
      // GET /db/pengajar
      // ======================================================

      if (
        request.method === "GET" &&
        segments.length === 2
      ) {

        const rows = await execute(
          env,
          `
            SELECT *
            FROM ${quoteIdent(table)}
            ORDER BY id ASC
          `
        );

        return jsonResponse({
          success: true,
          data: rows,
          count: rows.length,
        });
      }


      // ======================================================
      // GET BERDASARKAN ID
      // GET /db/pengajar/ID
      // ======================================================

      if (
        request.method === "GET" &&
        segments.length === 3
      ) {

        const id = segments[2];

        const rows = await execute(
          env,
          `
            SELECT *
            FROM ${quoteIdent(table)}
            WHERE id = ?
            LIMIT 1
          `,
          [id]
        );

        if (rows.length === 0) {
          return errorResponse(
            "Data tidak ditemukan.",
            404
          );
        }

        return jsonResponse({
          success: true,
          data: rows[0],
        });
      }


      // ======================================================
      // INSERT
      // POST /db/pengajar
      // ======================================================

      if (
        request.method === "POST" &&
        segments.length === 2
      ) {

        const body =
          await parseJsonBody(request);

        if (!body) {
          return errorResponse(
            "Payload JSON tidak valid.",
            400
          );
        }

        const {
          sql,
          values
        } = buildInsertSql(
          table,
          body
        );

        const rows = await execute(
          env,
          sql,
          values
        );

        return jsonResponse(
          {
            success: true,
            message:
              "Data berhasil ditambahkan.",
            data:
              rows[0] ?? null,
          },
          201
        );
      }


      // ======================================================
      // UPDATE
      // PUT /db/pengajar/ID
      // ======================================================

      if (
        request.method === "PUT" &&
        segments.length === 3
      ) {

        const id = segments[2];

        const body =
          await parseJsonBody(request);

        if (!body) {
          return errorResponse(
            "Payload JSON tidak valid.",
            400
          );
        }

        const input = {
          ...body,
          id,
        };

        const {
          sql,
          values
        } = buildUpdateSql(
          table,
          input
        );

        const rows = await execute(
          env,
          sql,
          values
        );

        if (rows.length === 0) {
          return errorResponse(
            "Data tidak ditemukan.",
            404
          );
        }

        return jsonResponse({
          success: true,
          message:
            "Data berhasil diperbarui.",
          data: rows[0],
        });
      }


      // ======================================================
      // DELETE SATU DATA
      // DELETE /db/pengajar/ID
      // ======================================================

      if (
        request.method === "DELETE" &&
        segments.length === 3
      ) {

        const id = segments[2];

        const rows = await execute(
          env,
          `
            DELETE FROM ${quoteIdent(table)}
            WHERE id = ?
            RETURNING *
          `,
          [id]
        );

        if (rows.length === 0) {
          return errorResponse(
            "Data tidak ditemukan.",
            404
          );
        }

        return jsonResponse({
          success: true,
          message:
            "Data berhasil dihapus.",
          data: rows[0],
        });
      }


      // ======================================================
      // DELETE BANYAK
      // POST /db/pengajar/delete
      // ======================================================

      if (
        request.method === "POST" &&
        segments.length === 3 &&
        segments[2] === "delete"
      ) {

        const body =
          await parseJsonBody(request);

        if (
          !body ||
          !Array.isArray(body.ids) ||
          body.ids.length === 0
        ) {
          return errorResponse(
            "Daftar ID tidak boleh kosong.",
            400
          );
        }

        const ids = body.ids.filter(
          (id) =>
            typeof id === "string" &&
            id.length > 0
        );

        if (ids.length === 0) {
          return errorResponse(
            "ID tidak valid.",
            400
          );
        }

        const placeholders =
          ids.map(() => "?").join(", ");

        const rows = await execute(
          env,
          `
            DELETE FROM ${quoteIdent(table)}
            WHERE id IN (${placeholders})
            RETURNING id
          `,
          ids
        );

        return jsonResponse({
          success: true,
          message:
            "Data berhasil dihapus.",
          deleted: rows.length,
          ids: rows.map(
            (row) => row.id
          ),
        });
      }

      // ======================================================
      // REPLACE BANYAK DATA
      // POST /db/pengajar/replace
      // ======================================================

      if (
        request.method === "POST" &&
        segments.length === 3 &&
        segments[2] === "replace"
      ) {
        const body = await parseJsonBody(request);

        if (
          !body ||
          !Array.isArray(body.rows)
        ) {
          return errorResponse(
            "Payload harus berisi array rows.",
            400
          );
        }

        const rows = body.rows.filter(
          (row) => row && typeof row === "object"
        );

        const insertedRows = [];

        for (const row of rows) {
          const { sql, values } = buildInsertSql(
            table,
            row
          );
          const result = await execute(env, sql, values);
          if (result.length > 0) {
            insertedRows.push(result[0]);
          }
        }

        return jsonResponse({
          success: true,
          message:
            "Data berhasil diganti.",
          data: insertedRows,
          count: insertedRows.length,
        }, 201);
      }

      // ======================================================
      // ENDPOINT TIDAK DIDUKUNG
      // ======================================================

      return errorResponse(
        "Metode atau endpoint tidak didukung.",
        404
      );

    } catch (error) {

      console.error(
        "D1 Worker Error:",
        error
      );

      return errorResponse(
        error instanceof Error
          ? error.message
          : "Kesalahan server.",
        500
      );
    }
  },
}