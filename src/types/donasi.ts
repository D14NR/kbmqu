export type DonasiRecord = {
  id: string;
  nama_pemilik: string;
  nama_bank: string;
  alamat_rekening: string;
  created_at?: string;
  updated_at?: string;
};

export type DonasiDraft = {
  nama_pemilik: string;
  nama_bank: string;
  alamat_rekening: string;
};

export type DonasiTransaksiRecord = {
  id: string | number;
  nama_pengirim: string;
  tanggal: string;
  jumlah_transaksi_masuk: number;
  jumlah_transaksi_keluar: number;
  keterangan: string;
  created_at?: string;
  updated_at?: string;
};

export type DonasiTransaksiDraft = {
  nama_pengirim: string;
  tanggal: string;
  jumlah_transaksi_masuk: string | number;
  jumlah_transaksi_keluar: string | number;
  keterangan: string;
};
