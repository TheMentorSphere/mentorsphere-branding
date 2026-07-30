import { normaliseText } from "./terminology";
import type { ChatMessage, ChatResponse } from "./types";

const SAFEGUARDING_URL = "https://www.thementorsphere.co.uk/safeguarding-policy/";
const CONTACT_URL = "https://www.thementorsphere.co.uk/contact/";
const EDUCATION_SEND_URL = "https://www.thementorsphere.co.uk/support-services/";

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function deterministicResponse(
  message: string,
  history: readonly ChatMessage[] = [],
): ChatResponse | null {
  const text = normaliseText(message);

  const immediateRisk = matchesAny(text, [
    /\b(immediate danger|danger right now|medical emergency|being attacked)\b/,
    /\b(kill myself|end my life|suicide|suicidal|hurt myself|self harm right now)\b/,
    /\b(child|young person|i|we|someone|my child|a child)\b.{0,35}\b(is unsafe|unsafe at home|being hurt)\b/,
    /\b(i|we|someone|my partner|my parent|my child|a child|a young person)\b.{0,45}\b(abused|abusing me|hurt me|hurting me)\b/,
    /\b(i|we|my child|a child|someone)\b.{0,30}\b(do not|dont|does not|doesnt)\b.{0,12}\bfeel safe\b/,
    /\b(need|want) to (tell|talk to) someone\b.{0,20}\babout abuse\b/,
    /\b(overdose|unconscious|not breathing|cannot breathe|cant breathe)\b/,
    /\b(safeguarding disclosure|disclose abuse)\b/,
  ]);
  if (immediateRisk) {
    return {
      answer:
        "This chatbot is not monitored. It is not an emergency or safeguarding disclosure route. If anyone is in immediate danger, call 999 now. Otherwise, use an appropriate healthcare, police, social-care or local-authority safeguarding route. Please do not submit a detailed disclosure here. The MentorSphere Safeguarding Policy explains the service boundary and contact route.",
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
      /\b(should i|can i|do i need to)\b.{0,25}\b(increase|raise|lower|reduce|decrease|stop|change)\b.{0,20}\b(my )?(adhd )?medication\b/,
      /\bwhat (dose|dosage)\b.{0,20}\b(should|can|do)\b.{0,12}\b(i|someone)\b.{0,8}\b(take|use)\b/,
      /\bwhat (medication|dose|dosage) should i take\b/,
      /\b(are|is)\b.{0,12}\b(side effects|side effect)\b.{0,12}\b(normal|safe|expected)\b/,
      /\bmedication\b.{0,20}\b(side effects|dose|dosage)\b/,
    ])
  ) {
    return {
      answer:
        "The MentorSphere chatbot cannot provide medical or medication advice. Please speak to an appropriately qualified healthcare professional about medication, dose changes or side effects.",
      sources: [],
      kind: "boundary",
    };
  }

  if (
    matchesAny(text, [
      /\b(interpret|read|review|explain)\b.{0,35}\b(medical|diagnosis|diagnostic|clinical)\b.{0,20}\b(report|record|document)\b/,
      /\bwhat does\b.{0,25}\b(medical|diagnosis|diagnostic|clinical)\b.{0,20}\b(report|record|document)\b.{0,15}\bmean\b/,
      /\b(medical|diagnosis|diagnostic|clinical)\b.{0,20}\b(report|record|document)\b.{0,25}\b(interpret|read|review|explain|mean)\b/,
    ])
  ) {
    return {
      answer:
        "The MentorSphere chatbot cannot review or interpret personal clinical documents. Please do not paste or upload a medical, diagnosis or clinical report here. Ask an appropriately qualified healthcare professional to explain the document.",
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
      /\bgive me medical advice\b/,
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

  if (
    matchesAny(text, [
      /\b(legal advice|interpret my ehcp|tell me my legal rights|represent me legally)\b/,
      /\b(has|have|is|are|was|were)\b.{0,40}\b(council|school|local authority)\b.{0,25}\b(broken the law|illegal|unlawful|acting unlawfully)\b/,
      /\bwhat are my legal rights\b/,
      /\bshould i appeal\b/,
      /\bdo i have a legal case\b/,
      /\b(interpret|explain)\b.{0,25}\b(ehcp|education health and care plan)\b.{0,20}\b(legally|legal)\b/,
    ])
  ) {
    return {
      answer:
        "The chatbot does not provide legal advice, and The MentorSphere does not provide legal representation. The MentorSphere can provide practical education information, organisation and communication support. Please obtain individual legal advice from an appropriately qualified source.",
      sources: [
        {
          title: "Education and SEND support",
          url: EDUCATION_SEND_URL,
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

  const previousUserMessages = history.filter((item) => item.role === "user");
  if (/^(how much|what does it cost|what is the price)$/.test(text) && previousUserMessages.length <= 1) {
    return {
      answer:
        "Which service would you like pricing for: tutoring, ADHD coaching, or Education and SEND support?",
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
