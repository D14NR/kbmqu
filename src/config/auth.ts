export const authStorageKey = "jadwal-app-auth-session";

export type LoginAccount = {
  id?: string;
  username: string;
  password: string;
  roll: string;
  cabang: string;
};

export const loginAccounts: LoginAccount[] = [
  { username: "Admin", password: "dian290192", roll: "admin", cabang: "" },

];