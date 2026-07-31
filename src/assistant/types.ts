export type KnowledgeStatus = "current" | "pending" | "archived" | "excluded";

export type KnowledgeCategory =
  | "tutoring"
  | "adhd-coaching"
  | "education-send"
  | "pricing"
  | "booking"
  | "policy"
  | "contact";

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  sourcePage: string;
  sourceUrl: string;
  documentVersion: string;
  effectiveDate: string;
  lastReviewed: string;
  validUntil?: string;
  keywords: readonly string[];
  alternativeTerms: readonly string[];
  concepts: readonly string[];
  status: KnowledgeStatus;
  priority: number;
}

export interface SourceLink {
  title: string;
  url: string;
}

export interface RetrievedEntry {
  entry: KnowledgeEntry;
  score: number;
  matchedTerms: readonly string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  sessionId: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  sources: SourceLink[];
  kind: "answer" | "clarification" | "fallback" | "safety" | "boundary";
}
