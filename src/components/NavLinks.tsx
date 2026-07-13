"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Library" },
  { href: "/practice", label: "Review" },
  { href: "/free", label: "Free" },
  { href: "/dashboard", label: "Progress" },
];

export default function NavLinks() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex items-center gap-1 text-sm">
      {LINKS.map((l) => {
        const active = isActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              "relative rounded-md px-2.5 py-1.5 " +
              (active
                ? "text-clinical-700 dark:text-clinical-200"
                : "text-slate-500 hover:text-clinical-700 dark:text-slate-400 dark:hover:text-clinical-200")
            }
          >
            {l.label}
            <span
              className={
                "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-clinical-500 transition-all duration-300 " +
                (active ? "opacity-100" : "opacity-0")
              }
            />
          </Link>
        );
      })}
    </div>
  );
}
