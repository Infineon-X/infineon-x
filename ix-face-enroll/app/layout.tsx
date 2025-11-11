import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";

const Sans = Roboto({
  variable: "--font-roboto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const Mono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "IX Face Enroll",
  description: "Face enrollment application",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IX Face Enroll",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${Sans.variable} ${Mono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
