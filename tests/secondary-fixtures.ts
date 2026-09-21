import { validIntakeRequest } from "./fixtures";
export function validSecondaryRequest(): Record<string, unknown> {
    const input = validIntakeRequest();
    input.formVersion = "secondary-learner-profile-v1";
    Object.assign(input.learner as object, { dateOfBirth: "2012-04-15", yearGroup: "Year 9", examBoards: { English: "", Maths: "", Science: "", Other: "" } });
    input.sessionPreferences = { sessionLength: ["Not sure"], sessionFrequency: ["1 per week"], widerSupport: "" };
    return input;
}
export function section(input: Record<string, unknown>, key: string): Record<string, unknown> { return input[key] as Record<string, unknown>; }
