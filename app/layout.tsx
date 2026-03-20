import type { Metadata } from "next";
import localFont from "next/font/local";
import SessionProvider from "@/components/providers/SessionProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Cue",
  description: "Your hourly signal to keep building.",
  manifest: "/manifest.json",
  themeColor: "#18181b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cue",
  },
  icons: {
    apple: "/icon-192.png",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
