import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Quicksand } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import { Toaster } from "@/components/ui/sonner";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand" });

export const metadata: Metadata = {
  title: "AHE (Anak Hebat) - Memberdayakan Masa Depan Melalui Pendidikan Kreatif",
  description: "Aplikasi manajemen pusat les berbasis web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${jakarta.variable} ${quicksand.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
