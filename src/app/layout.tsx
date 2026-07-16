import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Área de Serviço para Autocaravanas em Armação de Pêra, Algarve. 57 lugares, vista mar, ambiente natural. Reserve online.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://algarvecampingcarpark.pt"
  ),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Algarve Camping",
  },
  applicationName: "Algarve Camping Car Park",
  themeColor: "#0e7a8c",
  icons: {
    icon: [
      { url: "/icons/app-icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/icons/app-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.png",
  },
  formatDetection: {
    telephone: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${dmSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
