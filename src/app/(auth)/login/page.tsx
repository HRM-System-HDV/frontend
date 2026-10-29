"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faEye,
  faEyeSlash,
  faLock,
  faHourglassHalf,
} from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Checkbox } from "@/components/ui/Form";
import { useCurrentUser } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toast "Phiên làm việc đã hết hạn" — thumbnail ngang góc phải trên, tự ẩn sau ~6s.
  const [expToast, setExpToast] = useState(false);
  const [expToastExit, setExpToastExit] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("hrm_session_expired") === "1") {
        sessionStorage.removeItem("hrm_session_expired");
        setExpToast(true);
        const t1 = setTimeout(() => setExpToastExit(true), 5700);
        const t2 = setTimeout(() => {
          setExpToast(false);
          setExpToastExit(false);
        }, 6000);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Quên mật khẩu qua API thật
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSubmitting(true);
    setForgotError(null);
    setForgotMessage(null);
    try {
      await apiPost<{ ok: boolean }>("/api/auth/forgot-password", { email: forgotEmail });
      setForgotMessage("✅ Mật khẩu đã được đặt lại về mặc định: 123456. Hãy đăng nhập và đổi mật khẩu mới.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể đặt lại mật khẩu";
      setForgotError(msg);
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const from =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("from")
          : null;
      router.push(from && from.startsWith("/dashboard") ? from : "/dashboard/employees");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <main className="w-full max-w-md py-6">
      {/* Toast: hết phiên làm việc — góc phải trên, tự mất sau ~6s */}
      {expToast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg bg-white ${
            expToastExit ? "hrm-toast-anim-exit" : "hrm-toast-anim"
          }`}
          role="alert"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <FontAwesomeIcon icon={faHourglassHalf} fontSize={15} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900">Phiên làm việc đã hết hạn</div>
            <div className="text-xs text-gray-500 mt-0.5">Vui lòng đăng nhập lại để tiếp tục phiên trực.</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setExpToastExit(true);
              setTimeout(() => {
                setExpToast(false);
                setExpToastExit(false);
              }, 300);
            }}
            className="ml-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Đăng nhập</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-300 shadow-card p-6">
          <form onSubmit={handleLogin}>
            <Field label="Email" required>
              <div className="relative">
                <FontAwesomeIcon icon={faEnvelope} fontSize={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="vidu@company.com"
                  className={`pl-9 ${error ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400" : ""}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </Field>

            <Field label="Mật khẩu" required>
              <div className="relative">
                <FontAwesomeIcon icon={faLock} fontSize={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${error ? "text-red-400" : "text-gray-400"}`} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu..."
                  className={`pl-9 pr-10 ${error ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400" : ""}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label="Hiện/ẩn mật khẩu"
                >
                  {showPassword ? <FontAwesomeIcon icon={faEyeSlash} fontSize={16} /> : <FontAwesomeIcon icon={faEye} fontSize={16} />}
                </button>
              </div>
            </Field>

            <div className="flex items-center justify-between mb-5">
              <Checkbox label="Ghi nhớ đăng nhập" defaultChecked />
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm text-primary hover:underline cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            <Button type="submit" block size="lg" disabled={submitting}>
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
            {error && (
              <p className="text-sm text-red-600 mt-3 text-center">{error}</p>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 HRM System — Hệ thống Quản lý Nhân sự nội bộ doanh nghiệp
        </p>

      <Modal
        open={forgotOpen}
        onClose={() => {
          setForgotOpen(false);
          setForgotError(null);
          setForgotMessage(null);
        }}
        title="Quên mật khẩu"
        size="sm"
        footer={
          <>
            <Button
              variant="white"
              onClick={() => {
                setForgotOpen(false);
                setForgotError(null);
                setForgotMessage(null);
              }}
            >
              Đóng
            </Button>
            <Button
              onClick={handleForgotPassword}
              disabled={forgotSubmitting || !forgotEmail}
            >
              {forgotSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleForgotPassword} className="space-y-3">
          <Field label="Email" required>
            <Input
              type="email"
              placeholder="vidu@company.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
          </Field>
          {forgotError && (
            <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {forgotError}
            </p>
          )}
          {forgotMessage && (
            <p className="text-sm text-green-700 bg-green-50 p-2.5 rounded-lg border border-green-200">
              {forgotMessage}
            </p>
          )}
        </form>
      </Modal>
    </main>
  );
}

