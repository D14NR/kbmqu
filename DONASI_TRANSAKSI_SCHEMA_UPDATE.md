# Skema Transaksi Donasi (`donasi_transaksi`)

## 1. Definisi Tabel SQLite / D1
```sql
CREATE TABLE donasi_transaksi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_pengirim TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    jumlah_transaksi_masuk REAL NOT NULL DEFAULT 0,
    jumlah_transaksi_keluar REAL NOT NULL DEFAULT 0,
    keterangan TEXT NOT NULL DEFAULT 'donasi masuk',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hidden_nama_pengirim INTEGER NOT NULL DEFAULT 0,
    jenis_transaksi TEXT NOT NULL DEFAULT 'Dana Masuk'
);
```

## 2. Pilihan Kategori (`jenis_transaksi`)
Berikut 6 pilihan kategori yang disediakan dalam form modal dan filter tabel:

1. **Dana Masuk** (Default untuk transaksi masuk/donasi)
   - Badge: Hijau (`bg-success-subtle text-success`)
   - Icon: `bi-arrow-down-left-circle-fill`
   - Jenis arus: Transaksi Masuk (`jumlah_transaksi_masuk`)

2. **Dana Keluar**
   - Badge: Merah (`bg-danger-subtle text-danger`)
   - Icon: `bi-arrow-up-right-circle-fill`
   - Jenis arus: Transaksi Keluar (`jumlah_transaksi_keluar`)

3. **Pembayaran Tagihan** (Otomatis terpilih saat melunasi tagihan server di modal)
   - Badge: Kuning/Amber (`bg-warning-subtle text-warning-emphasis`)
   - Icon: `bi-receipt`
   - Jenis arus: Transaksi Keluar (`jumlah_transaksi_keluar`)

4. **Pembelian** (Pembelian perlengkapan, lisensi, aset)
   - Badge: Biru muda/Cyan (`bg-info-subtle text-info-emphasis`)
   - Icon: `bi-cart3`
   - Jenis arus: Transaksi Keluar (`jumlah_transaksi_keluar`)

5. **Operasional** (Biaya operasional harian / bulanan)
   - Badge: Biru tua/Indigo (`bg-primary-subtle text-primary`)
   - Icon: `bi-gear-fill`
   - Jenis arus: Transaksi Keluar (`jumlah_transaksi_keluar`)

6. **Lainnya** (Transaksi lain-lain)
   - Badge: Abu-abu/Slate (`bg-secondary-subtle text-secondary`)
   - Icon: `bi-tag-fill`
   - Jenis arus: Fleksibel

## 3. Fitur yang Didukung
- **Kategori Pemilihan Interaktif**: Tombol pill chip dan dropdown kategori langsung di Modal Transaksi Donasi (`TransaksiDonasiModal.tsx`).
- **Penyimpanan Database**: Terintegrasi ke Cloudflare D1 worker & fallback store backend (`/db/donasi_transaksi`).
- **Kolom Kategori di Tabel**: Kolom `Kategori (jenis_transaksi)` pada Tab 2 Riwayat Transaksi (`DonasiView.tsx`).
- **Filter Berdasarkan Kategori**: Dropdown filter kategori di toolbar Riwayat Transaksi untuk menyaring transaksi berdasarkan salah satu dari 6 kategori.
