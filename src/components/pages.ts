import { Activity, BookOpen, Code2, House, Layers, UserRound, type LucideIcon } from "lucide-react";

export type PageLink = { href: string; label: string; icon: LucideIcon };

/** Site pages in navigation order. Plain module so both server (footer) and client (dock) code can use it. */
export const PAGES: PageLink[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/about", label: "About", icon: UserRound },
  { href: "/live", label: "Live system", icon: Activity },
  { href: "/projects", label: "Projects", icon: BookOpen },
  { href: "/stack", label: "Stack", icon: Layers },
  { href: "/code", label: "Code", icon: Code2 },
];
