"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Cpu, Users } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pi", label: "Pi", icon: Cpu },
  { href: "/enrolled", label: "Faces", icon: Users },
];

const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t md:hidden backdrop-blur-xl shadow-md"
      style={{
        backgroundColor: "var(--bg-glass)",
        borderColor: "var(--separator)",
      }}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-full px-3 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
              style={{
                color: isActive ? "var(--btn-primary)" : "var(--text-secondary)",
                backgroundColor: isActive ? "var(--bg-tertiary)" : "transparent",
              }}
              aria-label={item.label}
            >
              <Icon
                className="h-5 w-5"
                style={{
                  color: isActive
                    ? "var(--btn-primary)"
                    : "var(--text-secondary)",
                }}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;


