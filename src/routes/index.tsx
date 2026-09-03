import { createFileRoute } from "@tanstack/react-router";
import { VendApp } from "@/components/vend-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <VendApp />;
}
