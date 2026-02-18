export interface CapabilityScores {
  reliability: number;
  safety: number;
  capability: number;
  reputation: number;
  usability: number;
}

export interface Capability {
  slug: string;
  name: string;
  source: "openclaw" | "mcp";
  source_id: string;
  provider: string;
  description: string;
  category: string;
  repo_url: string | null;
  endpoint: string | null;
  protocol: "rest" | "mcp" | "openclaw";
  stars: number;
  forks: number;
  language: string | null;
  last_updated: string;
  contributors: number;
  has_tests: boolean;
  has_typescript: boolean;
  readme_length: number;
  scores: CapabilityScores;
  overall_score: number;
  ai_summary: string;
  one_liner: string;
  install_guide: string;
  usage_guide: string;
  safety_notes: string;
  dependencies: string[];
  latest_version: string;
  supported_clients: string[];
}

export const CATEGORIES: Record<string, string> = {
  "development": "Development",
  "data": "Data & Database",
  "web": "Web & Search",
  "productivity": "Productivity",
  "ai": "AI & LLM",
  "media": "Design & Media",
  "trading": "Trading & Finance",
  "communication": "Communication",
};

export const SCORE_LABELS: Record<keyof CapabilityScores, string> = {
  reliability: "可靠性",
  safety: "安全性",
  capability: "能力范围",
  reputation: "社区口碑",
  usability: "易用性",
};

export const SCORE_LABELS_EN: Record<keyof CapabilityScores, string> = {
  reliability: "Reliability",
  safety: "Safety",
  capability: "Capability",
  reputation: "Reputation",
  usability: "Usability",
};
