fetch("http://localhost:3000/db/donasi_transaksi/1", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
      nama_pengirim: "Test Update",
      tanggal: "2026-09-04",
      jumlah_transaksi_masuk: 50000,
      jumlah_transaksi_keluar: 0,
      keterangan: "pemeliharaan database&server"
  })
}).then(r => r.json()).then(console.log).catch(console.error);
