export const terminologyGroups: ReadonlyArray<ReadonlyArray<string>> = [
  ["home schooling", "homeschooling", "home school", "elective home education", "ehe"],
  ["sen", "special educational needs", "send", "additional needs", "special needs"],
  ["eotas", "education otherwise than at school"],
  ["ehcp", "education health and care plan", "education plan"],
  ["adhd therapy", "adhd help", "adhd support", "adhd coaching", "executive function coaching"],
  ["trial lesson", "trial session", "discovery call", "intro call", "introductory session", "free introduction"],
  ["monthly tutoring package", "monthly plan", "subscription", "regular tutoring plan"],
  ["work pay", "employer pay", "company pay", "workplace funded", "employer funded"],
  ["access to work", "atw", "government workplace funding"],
  ["miss a lesson", "missed lesson", "late cancellation", "cancel", "reschedule"],
  ["cover tutor", "another tutor", "someone else teaching", "temporary tutor", "replacement tutor"],
  ["assessment help", "referral preparation", "getting assessed", "diagnosis referral"],
  ["private candidate", "private exam", "exam centre", "access arrangements"],
  ["parent coaching", "guardian coaching", "family strategies"],
  ["math", "maths", "mathematics"],
];

const spellingCorrections: Readonly<Record<string, string>> = {
  assesment: "assessment",
  assessement: "assessment",
  cancelation: "cancellation",
  coachng: "coaching",
  dignosis: "diagnosis",
  disgnose: "diagnose",
  employeer: "employer",
  homechooling: "homeschooling",
  math: "maths",
  neurodiversent: "neurodivergent",
  rescedule: "reschedule",
  safegarding: "safeguarding",
  subcription: "subscription",
  tutering: "tutoring",
};

export function normaliseText(value: string): string {
  return value
    .toLocaleLowerCase("en-GB")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[£]/g, " £ ")
    .replace(/[^a-z0-9£+.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => spellingCorrections[token] ?? token)
    .join(" ");
}

export function expandTerminology(value: string): Set<string> {
  const normalised = normaliseText(value);
  const expanded = new Set(normalised.split(" ").filter(Boolean));
  expanded.add(normalised);

  for (const group of terminologyGroups) {
    if (!group.some((term) => normalised.includes(normaliseText(term)))) continue;
    for (const term of group) {
      const normalisedTerm = normaliseText(term);
      expanded.add(normalisedTerm);
      for (const token of normalisedTerm.split(" ")) expanded.add(token);
    }
  }

  return expanded;
}
