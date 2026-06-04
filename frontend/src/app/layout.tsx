import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";
import PasscodeGate from "@/components/PasscodeGate";

export const metadata: Metadata = {
  title: "ListenWise - 音频转写工具",
  description: "支持音频上传、浏览器录音、逐字稿查看和导出",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <PasscodeGate>
          <Navbar />
          <div className="flex min-h-[calc(100vh-72px)]">
            <Suspense fallback={null}>
              <AppSidebar />
            </Suspense>
            <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8">
              {children}
            </main>
          </div>
        </PasscodeGate>
      </body>
    </html>
  );
}
