import type { Metadata } from "next";
import { Code } from "@/components/sections/Code";

export const metadata: Metadata = { title: "Code", description: "Architecture, tests, quality gates and how to run it locally." };

export default function CodePage() {
  return (
    <main className="page-container flex-1 pt-8">
      <Code />
    </main>
  );
}
