import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import {
  LayoutDashboard,
  Github,
  FlaskConical,
  Map,
  Code2,
  Settings,
} from "lucide-react";
import SessionProvider from "@/components/providers/SessionProvider";
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
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/kaggle", label: "Kaggle", icon: FlaskConical },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/leetcode", label: "LeetCode", icon: Code2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

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
        <SessionProvider>
          <div className="flex min-h-screen">
            <aside className="w-64 border-r border-foreground/10 p-4 flex flex-col gap-2">
              <Link href="/" className="text-xl font-bold mb-6 px-2">
                Cue
              </Link>
              <nav className="flex flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-foreground/5 transition-colors"
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="flex-1 p-6">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
