import Link from "next/link";
import { PROFILE } from "@/content/profile";
import { PAGES } from "./pages";
import { SocialLinks } from "./SocialLinks";

export function Footer() {
  return (
    // Bottom padding keeps the footer clear of the docks.
    <footer className="border-t border-border pt-12 pb-36">
      <div className="page-container flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-medium">{PROFILE.name}</p>
          <p className="mt-1 text-sm text-muted">{PROFILE.role} · built with .NET 10, PostgreSQL, YARP and Next.js</p>
          <div className="mt-5">
            <SocialLinks variant="inline" />
          </div>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
          {PAGES.map((page) => (
            <Link key={page.href} href={page.href} className="text-muted transition hover:text-hover">
              {page.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
