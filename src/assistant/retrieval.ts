import { currentKnowledgeEntries } from "./knowledge-base";
import { expandTerminology, normaliseText } from "./terminology";
import type { KnowledgeEntry, RetrievedEntry, SourceLink } from "./types";

const stopWords = new Set([
  "a",
  "about",
  "and",
  "are",
  "can",
  "do",
  "for",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "with",
  "you",
]);

function tokens(value: string): string[] {
  return normaliseText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function trigrams(value: string): Set<string> {
  const compact = normaliseText(value).replace(/\s+/g, " ");
  const result = new Set<string>();
  for (let index = 0; index <= compact.length - 3; index += 1) {
    result.add(compact.slice(index, index + 3));
  }
  return result;
}

function diceSimilarity(left: string, right: string): number {
  const leftTrigrams = trigrams(left);
  const rightTrigrams = trigrams(right);
  if (leftTrigrams.size === 0 || rightTrigrams.size === 0) return 0;

  let intersection = 0;
  for (const trigram of leftTrigrams) {
    if (rightTrigrams.has(trigram)) intersection += 1;
  }
  return (2 * intersection) / (leftTrigrams.size + rightTrigrams.size);
}

function searchableText(entry: KnowledgeEntry): string {
  return [
    entry.title,
    entry.category,
    entry.content,
    ...entry.keywords,
    ...entry.alternativeTerms,
    ...entry.concepts,
  ].join(" ");
}

function containsTerm(haystack: string, term: string): boolean {
  if (term.includes(" ") || /[£+.\d]/.test(term)) return haystack.includes(term);
  return haystack.split(" ").includes(term);
}

function scoreEntry(query: string, entry: KnowledgeEntry): RetrievedEntry {
  const normalisedQuery = normaliseText(query);
  const expanded = expandTerminology(query);
  const queryTokens = new Set(tokens([...expanded].join(" ")));
  const title = normaliseText(entry.title);
  const content = normaliseText(entry.content);
  const keywordText = normaliseText(entry.keywords.join(" "));
  const alternativeText = normaliseText(entry.alternativeTerms.join(" "));
  const conceptText = normaliseText(entry.concepts.join(" "));
  const matchedTerms: string[] = [];
  let score = entry.priority * 0.04;

  for (const term of expanded) {
    if (term.length < 2 || stopWords.has(term)) continue;
    if (containsTerm(title, term)) {
      score += term.includes(" ") ? 4.2 : 1.6;
      matchedTerms.push(term);
    }
    if (containsTerm(keywordText, term)) {
      score += term.includes(" ") ? 4.5 : 1.9;
      matchedTerms.push(term);
    }
    if (containsTerm(alternativeText, term)) {
      score += term.includes(" ") ? 4.8 : 2.1;
      matchedTerms.push(term);
    }
    if (containsTerm(conceptText, term)) {
      score += term.includes(" ") ? 3.5 : 1.5;
      matchedTerms.push(term);
    }
    if (containsTerm(content, term)) score += term.includes(" ") ? 2.3 : 0.75;
  }

  const entryTokens = new Set(tokens(searchableText(entry)));
  let tokenMatches = 0;
  for (const token of queryTokens) {
    if (entryTokens.has(token)) {
      tokenMatches += 1;
      matchedTerms.push(token);
    }
  }
  score += tokenMatches * 0.8;

  const fuzzyCandidates = [...entry.alternativeTerms, ...entry.keywords];
  const fuzzyScore = fuzzyCandidates.reduce(
    (best, candidate) => Math.max(best, diceSimilarity(normalisedQuery, candidate)),
    0,
  );
  if (fuzzyScore >= 0.34) score += fuzzyScore * 3.2;

  return {
    entry,
    score,
    matchedTerms: [...new Set(matchedTerms)],
  };
}

export function retrieveKnowledge(
  query: string,
  limit = 4,
  today = new Date(),
): readonly RetrievedEntry[] {
  return currentKnowledgeEntries(today)
    .map((entry) => scoreEntry(query, entry))
    .filter((result) => result.score >= 2.2)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function sourceLinks(results: readonly RetrievedEntry[]): SourceLink[] {
  const seen = new Set<string>();
  const sources: SourceLink[] = [];

  for (const result of results) {
    if (seen.has(result.entry.sourceUrl)) continue;
    const url = new URL(result.entry.sourceUrl);
    if (url.protocol !== "https:" || url.hostname !== "www.thementorsphere.co.uk") continue;
    seen.add(result.entry.sourceUrl);
    sources.push({ title: result.entry.sourcePage, url: result.entry.sourceUrl });
    if (sources.length === 3) break;
  }

  return sources;
}

export function isReliableRetrieval(results: readonly RetrievedEntry[]): boolean {
  const first = results[0];
  if (!first) return false;
  return (first.score >= 3.25 && first.matchedTerms.length >= 1) || first.matchedTerms.length >= 2;
}
