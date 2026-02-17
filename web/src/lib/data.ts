import fs from "fs";
import path from "path";
import { Capability } from "./types";

let _cache: Capability[] | null = null;

function loadCapabilities(): Capability[] {
  const candidates = [
    path.join(process.cwd(), "data", "capabilities.json"),
    path.join(process.cwd(), "..", "data", "capabilities.json"),
  ];
  const filePath = candidates.find((p) => fs.existsSync(p));
  if (!filePath) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Capability[];
}

function getCapabilities(): Capability[] {
  if (!_cache) _cache = loadCapabilities();
  return _cache;
}

export function getAllCapabilities(): Capability[] {
  return getCapabilities();
}

export function getCapabilityBySlug(slug: string): Capability | undefined {
  return getCapabilities().find((c) => c.slug === slug);
}

export function getCapabilitiesByCategory(category: string): Capability[] {
  return getCapabilities().filter((c) => c.category === category);
}

export function getCategories(): string[] {
  return [...new Set(getCapabilities().map((c) => c.category))].sort();
}

export function getTopCapabilities(limit = 10): Capability[] {
  return getCapabilities().slice(0, limit);
}
