import { getAllCapabilities } from "@/lib/data";
import { Capability } from "@/lib/types";
import HomeClient from "./HomeClient";

export default function Home() {
  const capabilities = getAllCapabilities();
  return <HomeClient capabilities={capabilities} />;
}
