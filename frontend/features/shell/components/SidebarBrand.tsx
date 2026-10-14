"use client";

import Image from "next/image";
import Link from "next/link";

/** SwiftMove branding aligned with the top bar. */
export function SidebarBrand({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div
      className="flex h-[60px] items-center"
      style={{ padding: "0 16px" }}
    >
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2.5 no-underline"
        aria-label="SwiftMove Control Room home"
        onClick={onNavigate}
      >
        <Image
          src="/logo.png"
          alt=""
          width={44}
          height={44}
          priority
          style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0, display: "block" }}
        />
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, color: "#1e3a8a" }}>SwiftMove</div>
            <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>Logistics Control Room</div>
          </div>
        )}
      </Link>
    </div>
  );
}
