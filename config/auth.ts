export const authStorageKey = "jadwal-app-auth-session";

export type LoginAccount = {
  username: string;
  password: string;
  role: string;
  cabang: string;
};

export const loginAccounts: LoginAccount[] = [
  { username: "Admin", password: "dian290192", role: "admin", cabang: "" },
  { username: "semarang1", password: "443", role: "Semarang 1", cabang: "Semarang 1" },
  { username: "semarang2", password: "444", role: "Semarang 2", cabang: "Semarang 2" },
  { username: "semarang3", password: "", role: "Semarang 3", cabang: "Semarang 3" },
  { username: "semarang4", password: "442", role: "Semarang 4", cabang: "Semarang 4" },
  { username: "semarang5", password: "461", role: "Semarang 5", cabang: "Semarang 5" },
  { username: "semarang6", password: "465", role: "Semarang 6", cabang: "Semarang 6" },
  { username: "kendal", password: "448", role: "Kendal", cabang: "Kendal" },
  { username: "salatiga1", password: "219", role: "Salatiga1", cabang: "Salatiga 1" },
];
