"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/club", label: "Club", icono: "🏆" },
  { href: "/mi-ficha", label: "Mi Ficha", icono: "👤" },
];

export default function NavInferior() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg">
        {ITEMS.map((item) => {
          const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                activo ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <span className="text-xl leading-none">{item.icono}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
