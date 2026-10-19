import type { Metadata } from "next";
import { LiveSystem } from "@/components/live/LiveSystem";

export const metadata: Metadata = {
  title: "Live system",
  description: "Live metrics from the gateway and API, a real rate limiter to hit, and a sandbox to break.",
};

export default function LivePage() {
  return (
    <main className="page-container flex-1 pt-8">
      <LiveSystem />
    </main>
  );
}
