"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Github,
  FlaskConical,
  Map,
  Code2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/kaggle", label: "Kaggle", icon: FlaskConical },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/leetcode", label: "LeetCode", icon: Code2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-foreground/10 p-4 flex flex-col gap-2">
      <Link href="/" className="text-xl font-bold mb-6 px-2">
        Cue
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                isActive
                  ? "bg-foreground/10 font-medium"
                  : "hover:bg-foreground/5"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
