import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

config.autoAddCss = false;

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin", "vietnamese"],
});

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
    <html lang="vi" className={publicSans.variable}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
