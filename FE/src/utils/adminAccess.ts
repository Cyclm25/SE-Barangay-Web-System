export type AdminPanelRole = "admin" | "official" | "superadmin" | "sk_kagawad";

export function isSkKagawadRole(role?: string | null) {
  return String(role ?? "").trim().toLowerCase() === "sk_kagawad";
}

export function isSkKagawadPosition(position?: string | null) {
  return (
    String(position ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ") === "sk kagawad"
  );
}

export function isAdminViewOnly(role?: string | null, position?: string | null) {
  return isSkKagawadRole(role) || isSkKagawadPosition(position);
}

export function getStoredAdminViewOnly() {
  try {
    const appUserRaw = localStorage.getItem("app_user");
    const appUser = appUserRaw ? JSON.parse(appUserRaw) : null;
    return isAdminViewOnly(appUser?.role, localStorage.getItem("position"));
  } catch {
    return isAdminViewOnly(null, localStorage.getItem("position"));
  }
}
