import type { Metadata } from "next";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import "./globals.css";
import "./fonts.css";
import { AuthProvider } from "@/context/AuthContext";

config.autoAddCss = false;


export const metadata: Metadata = {
  title: "HRM System — Quản trị Nhân sự Nội bộ",
  description: "Hệ thống Quản lý Nhân sự, Ca kíp, Lương & Đổi ca On-Premises",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-full flex flex-col font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
