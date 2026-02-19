"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  Package,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/quotes", label: "見積管理", icon: FileText },
  { href: "/customers", label: "顧客管理", icon: Users },
  { href: "/staff", label: "担当者管理", icon: UserCog },
  { href: "/products", label: "商品マスタ", icon: Package },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-[#1e3a5f] text-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2d5a9e]">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-blue-300" />
          <div>
            <p className="font-bold text-sm leading-tight">湧水堂リフォーム</p>
            <p className="text-xs text-blue-300 leading-tight">営業支援システム</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-[#2d5a9e] text-white"
                  : "text-blue-200 hover:bg-[#2d5a9e]/60 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-[#2d5a9e] text-xs text-blue-400">
        v1.0.0
      </div>
    </aside>
  );
}
