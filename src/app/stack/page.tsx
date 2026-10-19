import type { Metadata } from "next";
import { Stack } from "@/components/sections/Stack";

export const metadata: Metadata = { title: "Stack", description: "Skills grouped by layer, each linked to where it runs on this site." };

export default function StackPage() {
  return (
    <main className="page-container flex-1 pt-8">
      <Stack />
    </main>
  );
}
