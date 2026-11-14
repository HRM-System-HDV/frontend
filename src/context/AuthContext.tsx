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
import { GATEWAY_URL, GatewayError, refreshSession } from "@/lib/api";

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff";
  roleTitle: string;
  branchId: string;
  branchName: string;
}

interface AuthMeResponse {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff";
  roleTitle: string;
  branchId: string | null;
}

function toSession(me: AuthMeResponse): UserSession {
  return {
    userId: me.id,
    name: me.name,
    email: me.email,
    role: me.role,
    roleTitle: me.roleTitle,
    branchId: me.branchId || "",
    branchName: "",
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
  branchName: "",
};

interface AuthContextType {
  user: UserSession;
  name: string;
  role: "admin" | "manager" | "staff";
  branchId: string;
  loading: boolean;
  authenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: ANONYMOUS_USER,
  name: "",
  role: "staff",
  branchId: "",
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

/** status 0 = không đo được (mất mạng/timeout), không phải do phiên chết. */
async function readMe(): Promise<{ status: number; session: UserSession | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}/api/auth/me`, {
      credentials: "include",
      signal: controller.signal,
    });
    if (!res.ok) return { status: res.status, session: null };
    const body = await res.json();
    if (!body || typeof body !== "object" || !("data" in body)) {
      return { status: res.status, session: null };
    }
    const session = toSession(body.data as AuthMeResponse);
    if (session.role === "staff") {
      // Cookie là httpOnly nên phải gọi API logout để server xoá phiên.
      await clearWebSession();
      return { status: res.status, session: null };
    }
    return { status: res.status, session };
  } catch {
    return { status: 0, session: null };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMe(): Promise<UserSession | null> {
  let first = await readMe();
  if (first.session) return first.session;
  // Access token chỉ 15 phút nên khi mở lại trang sau một thời gian, /me chết
  // trong khi phiên 7 ngày ở cookie refresh vẫn còn hạn. Đổi token rồi hỏi lại
  // một lần, thay vì bắt người dùng đăng nhập lại vô lý do.
  if (first.status === 401 && (await refreshSession())) {
    first = await readMe();
  }
  return first.session;
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
  // Số lần phiên trong máy trình duyệt đổi chủ (login/logout). /me lúc mount có
  // thể về trễ hơn một lần đăng nhập vừa xong (điền nhanh, gateway còn khởi động);
  // kết quả cũ chỉ đúng với phiên TRƯỚC đó nên phải bỏ, nếu không nó xoá phiên
  // hợp lệ và đá người dùng về /login dù cookie đã dùng được.
  const sessionEpochRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const epoch = sessionEpochRef.current;
    fetchMe().then((session) => {
      if (cancelled) return;
      // Chỉ áp kết quả khi chưa có login/logout nào xen vào; loading luôn tắt để
      // không kẹt màn hình "Đang tải dữ liệu phiên làm việc".
      if (sessionEpochRef.current === epoch) {
        if (session) {
          setUser(session);
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
        }
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
      // Server tự xoá hrm-session khi từ chối nó; JS ghi đè được cookie httpOnly
      // là không đúng, để server quyết định.
      sessionStorage.setItem("hrm_session_expired", "1");
    } catch {
      /* ignore */
    }
    router.replace(`/login?expired=1&from=${encodeURIComponent(pathname)}`);
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
      sessionEpochRef.current += 1;
      setUser(session);
      setAuthenticated(true);
      setLoading(false);
      signingOutRef.current = false;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const logout = useCallback(async () => {
    signingOutRef.current = true;
    sessionEpochRef.current += 1;
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
        branchId: user.branchId,
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
