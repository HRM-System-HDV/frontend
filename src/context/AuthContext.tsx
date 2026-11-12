"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiGet, apiPost, GatewayError } from "@/lib/api";
import type { UserAccount, UserRole } from "@/types";
export interface UserSession { userId: string; employeeId: string | null; branchId: string | null; name: string; email: string; role: UserRole }
const anonymous: UserSession = { userId: "", employeeId: null, branchId: null, name: "", email: "", role: "staff" };
function session(account: UserAccount): UserSession {
  const role = account.systemRole || account.role;
  if (!account.id || !["admin", "manager"].includes(role)) throw new GatewayError("STAFF_WEB_FORBIDDEN", "Tài khoản nhân viên chỉ sử dụng ứng dụng Mobile.", 403);
  return { userId: account.id, employeeId: account.employeeId || null, branchId: account.branchId || null, name: account.name, email: account.email, role };
}
interface AuthContextType {
  user: UserSession; name: string; role: UserRole; branchId: string | null;
  loading: boolean; authenticated: boolean; error: string | null;
  login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; reloadSession: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({ user: anonymous, name: "", role: "staff", branchId: null, loading: true, authenticated: false, error: null, login: async () => {}, logout: async () => {}, reloadSession: async () => {} });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(anonymous);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); const pathname = usePathname();
  const reloadSession = useCallback(async () => {
    setLoading(true); setError(null);
    try { setUser(session(await apiGet<UserAccount>("/api/auth/me"))); setAuthenticated(true); }
    catch (err) {
      setAuthenticated(false); setUser(anonymous);
      if (!(err instanceof GatewayError) || ![401, 403].includes(err.status)) setError(err instanceof Error ? err.message : "Không tải được phiên đăng nhập.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void reloadSession(); }, [reloadSession]);
  useEffect(() => { if (!loading && !authenticated && !error && pathname.startsWith("/dashboard")) router.replace(`/login?from=${encodeURIComponent(pathname)}`); }, [loading, authenticated, error, pathname, router]);
  const login = useCallback(async (email: string, password: string) => {
    const result = await apiPost<{ user: UserAccount }>("/api/auth/login", { email: email.trim(), password, clientPlatform: "web" });
    if (!result?.user) throw new GatewayError("INVALID_RESPONSE", "Phản hồi đăng nhập không hợp lệ.", 500);
    const next = session(result.user); setUser(next); setAuthenticated(true); setError(null);
  }, []);
  const logout = useCallback(async () => {
    try { await apiPost("/api/auth/logout", {}); }
    catch { /* Đóng phiên giao diện khi mạng gián đoạn; cookie vẫn do BE quản lý. */ }
    finally { setUser(anonymous); setAuthenticated(false); setError(null); router.replace("/login"); }
  }, [router]);
  return <AuthContext.Provider value={{ user, name: user.name, role: user.role, branchId: user.branchId, loading, authenticated, error, login, logout, reloadSession }}>{children}</AuthContext.Provider>;
}
export function useCurrentUser() { return useContext(AuthContext); }
