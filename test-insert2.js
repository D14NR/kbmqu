fetch("http://localhost:3000/db/donasi_transaksi", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
      nama_pengirim: "Test",
      tanggal: "2026-09-04",
      jumlah_transaksi_masuk: 25000,
      jumlah_transaksi_keluar: 0,
      keterangan: "pemeliharaan database&server"
  })
}).then(r => r.json()).then(console.log).catch(console.error);
