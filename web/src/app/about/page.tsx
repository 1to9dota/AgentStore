import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About AgentStore - MCP Plugin Rating Platform",
  description:
    "AgentStore is the DNS + credit rating platform for AI Agent capabilities, helping developers discover, evaluate, and compare MCP plugins.",
};

export default function AboutPage() {
  return <AboutClient />;
}
