"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, HomeIcon, StudioIcon, UserIcon } from "./Icons";

/** Bottom navigation. Hidden on artist pages and the booking flow, which have their own bars. */
export function TabBar({ signedIn, isArtist }: { signedIn: boolean; isArtist: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/artists/") || ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname)) return null;

  const tabs = [
    { href: "/", label: "Home", Icon: HomeIcon },
    { href: "/bookings", label: "Bookings", Icon: CalendarIcon },
    ...(isArtist ? [{ href: "/dashboard", label: "Studio", Icon: StudioIcon }] : []),
    { href: signedIn ? "/account" : "/login", label: signedIn ? "Account" : "Log in", Icon: UserIcon },
  ];

  return (
    <div className="tabbar">
      <nav aria-label="Main">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="tab" aria-current={active ? "page" : undefined}>
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
