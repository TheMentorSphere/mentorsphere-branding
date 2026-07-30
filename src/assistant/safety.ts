import { normaliseText } from "./terminology";
import type { ChatResponse } from "./types";

const SAFEGUARDING_URL = "https://www.thementorsphere.co.uk/safeguarding-policy/";
const CONTACT_URL = "https://www.thementorsphere.co.uk/contact/";

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function deterministicResponse(message: string): ChatResponse | null {
  const text = normaliseText(message);

  const immediateRisk = matchesAny(text, [
    /\b(immediate danger|danger right now|medical emergency|being attacked)\b/,
    /\b(kill myself|end my life|suicide|suicidal|hurt myself|self harm right now)\b/,
    /\b(child|young person|i|someone)\b.{0,35}\b(being abused|is unsafe|unsafe at home|being hurt)\b/,
    /\b(overdose|unconscious|not breathing|cannot breathe|cant breathe)\b/,
    /\b(safeguarding disclosure|disclose abuse)\b/,
  ]);
  if (immediateRisk) {
    return {
      answer:
        "This chatbot is not monitored and is not an emergency or safeguarding-reporting service. If anyone is in immediate danger, call 999 now. Otherwise, use the appropriate healthcare, police, social-care or local-authority safeguarding route. Please do not submit a detailed disclosure here. The MentorSphere Safeguarding Policy explains the service boundary and contact route.",
      sources: [{ title: "Safeguarding Policy", url: SAFEGUARDING_URL }],
      kind: "safety",
    };
  }

  if (
    matchesAny(text, [
      /\b(ignore|forget|override|bypass)\b.{0,25}\b(rules|instructions|prompt)\b/,
      /\b(show|reveal|print|repeat)\b.{0,25}\b(system prompt|hidden prompt|instructions)\b/,
      /\bdeveloper message\b/,
    ])
  ) {
    return {
      answer:
        "I cannot reveal or override the assistant's instructions. I can help with current information about The MentorSphere's services, pricing, booking and policies.",
      sources: [],
      kind: "boundary",
    };
  }

  if (
    matchesAny(text, [
      /\b(here is|paste|upload|attach|review|read)\b.{0,35}\b(ehcp|medical record|assessment report|diagnostic report|safeguarding evidence)\b/,
      /\b(date of birth|national insurance number|passport|nhs number)\b/,
    ])
  ) {
    return {
      answer:
        "Please do not paste or upload confidential medical, identification, assessment or safeguarding information here. Phase 1 does not accept files or review personal documents. Use the contact page to ask about an appropriate secure next step.",
      sources: [{ title: "Contact The MentorSphere", url: CONTACT_URL }],
      kind: "boundary",
    };
  }

  if (
    matchesAny(text, [
      /\b(diagnose me|diagnose my|do i have|does my child have)\b.{0,20}\b(adhd|autism|dyslexia)\b/,
      /\bcan you diagnose\b/,
      /\b(give me medical advice|what medication|change my medication|dosage)\b/,
    ])
  ) {
    return {
      answer:
        "The MentorSphere cannot diagnose a condition or provide medical advice. Referral preparation may help organise examples and questions before you speak with an appropriate healthcare or assessment professional.",
      sources: [
        {
          title: "ADHD and autism referral preparation",
          url: "https://www.thementorsphere.co.uk/support-services/referral-preparation/",
        },
      ],
      kind: "boundary",
    };
  }

  if (matchesAny(text, [/\b(legal advice|interpret my ehcp|tell me my legal rights|represent me legally)\b/])) {
    return {
      answer:
        "The MentorSphere can help with education information, organisation and communication, but it does not provide legal advice or legal representation and cannot interpret an individual EHCP in this chat.",
      sources: [
        {
          title: "EHCP support",
          url: "https://www.thementorsphere.co.uk/support-services/ehcp-support/",
        },
      ],
      kind: "boundary",
    };
  }

  const assessmentIsAmbiguous =
    /\b(assessment help|help with assessment|getting assessed)\b/.test(text) &&
    !/\b(adhd|autism|referral|exam|access arrangement|learning|baseline|tutoring)\b/.test(text);
  if (assessmentIsAmbiguous) {
    return {
      answer:
        "Do you mean preparation for an ADHD or autism referral, an educational starting-point assessment for tutoring, or help with exam access arrangements?",
      sources: [],
      kind: "clarification",
    };
  }

  if (
    matchesAny(text, [
      /\b(football|premier league|weather|stock price|recipe|capital of|celebrity|lottery)\b/,
      /\b(who won|latest news|general knowledge)\b/,
    ])
  ) {
    return {
      answer:
        "I can help with questions about The MentorSphere's services, pricing, booking and policies, but I cannot answer general questions.",
      sources: [],
      kind: "boundary",
    };
  }

  return null;
}
