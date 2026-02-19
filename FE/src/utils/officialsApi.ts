import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000", // change port if needed
  withCredentials: true, // keep if your backend uses cookies/sessions
});

export type Official = {
  id: number;          // BarangayAdminID
  name: string;        // AdminName
  position: string | null;
  email: string;
  status: boolean;     // Status
  dateCreated?: string;
};

export async function getOfficials(): Promise<Official[]> {
  const res = await api.get("/officials");
  return res.data;
}

export async function createOfficial(payload: {
  adminName: string;
  position?: string;
  email: string;
  password: string;
  superAdminId?: number;
}): Promise<Official> {
  const res = await api.post("/officials", payload);
  return res.data;
}

export async function updateOfficialStatus(id: number, status: boolean): Promise<Official> {
  const res = await api.patch(`/officials/${id}/status`, { status });
  return res.data;
}
