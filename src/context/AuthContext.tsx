"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { GATEWAY_URL, GatewayError } from "@/lib/api";

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff";
  roleTitle: string;
  branchId: string;
  branchSlug: string;
  branchName: string;
}

interface AuthMeResponse {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff";
  roleTitle: string;
  branchSlug: string | null;
}

function toSession(me: AuthMeResponse): UserSession {
  const slug = (me.branchSlug || "").toLowerCase();
  return {
    userId: me.id,
    name: me.name,
    email: me.email,
    role: me.role,
    roleTitle: me.roleTitle,
    branchId: slug ? `b-${slug}` : "",
    branchSlug: slug,
    branchName: !slug
      ? ""
      : slug === "hn-1"
        ? "Chi nhánh HN-1"
        : `Chi nhánh ${slug.toUpperCase()}`,
  };
}

// Placeholder khi chưa có phiên. Middleware server-side đã chặn /dashboard
// khi thiếu cookie nên placeholder này không bao giờ hiện menu thật.
// Trong lúc `loading` còn true, layout dashboard không render nội dung trang
// nên trang nào cũng chưa kịp hiện "Không có quyền truy cập" nháy lên.
const ANONYMOUS_USER: UserSession = {
  userId: "",
  name: "Đang tải...",
  email: "",
  role: "staff",
  roleTitle: "",
  branchId: "",
  branchSlug: "",
  branchName: "",
};

interface AuthContextType {
  user: UserSession;
  name: string;
  role: "admin" | "manager" | "staff";
  branchSlug: string;
  loading: boolean;
  authenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: ANONYMOUS_USER,
  name: "",
  role: "staff",
  branchSlug: "",
  loading: true,
  authenticated: false,
  login: async () => {},
  logout: async () => {},
});

// Staff chỉ dùng app di động: cookie phiên do gateway set khi đăng nhập phải
// được vô hiệu hoá ở server (cookie là httpOnly nên JS không xoá được).
async function clearWebSession() {
  try {
    await fetch(`${GATEWAY_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Mất mạng: phiên server còn hiệu lực nhưng web vẫn không dùng được.
  }
}

async function fetchMe(): Promise<UserSession | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}/api/auth/me`, {
      credentials: "include",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || typeof body !== "object" || !("data" in body)) return null;
    const session = toSession(body.data as AuthMeResponse);
    if (session.role === "staff") {
      // Cookie là httpOnly nên phải gọi API logout để server xoá phiên.
      await clearWebSession();
      return null;
    }
    return session;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession>(ANONYMOUS_USER);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  // Phân biệt "người dùng bấm đăng xuất" với "phiên hết hạn": chỉ trường hợp sau
  // mới đáng báo "Phiên làm việc đã hết hạn" ở trang login.
  const signingOutRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((session) => {
      if (cancelled) return;
      if (session) {
        setUser(session);
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Rơi khỏi phiên khi đang ở dashboard: phiên hết hạn thì để lại dấu cho trang
  // login báo toast, còn đăng xuất chủ đích thì về /login sạch, không báo gì.
  useEffect(() => {
    if (loading || authenticated || !pathname.startsWith("/dashboard")) return;
    if (signingOutRef.current) {
      router.replace("/login");
      return;
    }
    try {
      sessionStorage.setItem("hrm_session_expired", "1");
      document.cookie = "hrm-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch {
      /* ignore */
    }
    router.replace(`/login?from=${encodeURIComponent(pathname)}`);
  }, [loading, authenticated, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${GATEWAY_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      if (!res.ok) {
        const err = (body as { error?: { code?: string; message?: string } } | null)
          ?.error;
        throw new GatewayError(
          err?.code || `HTTP_${res.status}`,
          err?.message || "Đăng nhập thất bại",
          res.status
        );
      }
      const data = (body as { data?: { user?: AuthMeResponse } }).data;
      if (!data?.user) throw new GatewayError("UNKNOWN", "Phản hồi máy chủ không hợp lệ", 500);
      const session = toSession(data.user);
      if (session.role === "staff") {
        // Cookie là httpOnly nên phải gọi API logout để server xoá phiên.
        await clearWebSession();
        throw new GatewayError(
          "STAFF_WEB_FORBIDDEN",
          "Tài khoản nhân viên chỉ đăng nhập được trên ứng dụng di động.",
          403
        );
      }
      setUser(session);
      setAuthenticated(true);
      signingOutRef.current = false;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const logout = useCallback(async () => {
    signingOutRef.current = true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch(`${GATEWAY_URL}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Mất mạng vẫn cho đăng xuất cục bộ để không kẹt phiên.
    }
    setUser(ANONYMOUS_USER);
    setAuthenticated(false);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        name: user.name,
        role: user.role,
        branchSlug: user.branchSlug,
        loading,
        authenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(AuthContext);
}
