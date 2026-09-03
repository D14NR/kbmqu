export type DonasiRecord = {
  id: string;
  nama_pemilik: string;
  nama_bank: string;
  alamat_rekening: string;
  nominal_terkumpul: number;
  created_at?: string;
  updated_at?: string;
};

export type DonasiDraft = {
  nama_pemilik: string;
  nama_bank: string;
  alamat_rekening: string;
  nominal_terkumpul: string | number;
};
