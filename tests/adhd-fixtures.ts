export function validAdhdRequest(supportFor = "adult"): Record<string, unknown> {
    return {
        formVersion: "adhd-coaching-intake-v1", submissionId: "123e4567-e89b-42d3-a456-426614174000", turnstileToken: "fictional-turnstile-token", honeypot: "",
        respondent: { firstName: "Alex", surname: "Example", email: "alex@example.test", mobile: "", preferredContactMethods: ["Email"] }, supportFor,
        adult: { adhdStatus: "", adhdStatusOther: "", difficulties: [], difficultiesOther: "", priority: "", priorityOther: "" },
        child: { age: ["child", "combined"].includes(supportFor) ? "12" : "", name: ["child", "combined"].includes(supportFor) ? "Sam Example" : "", educationalStage: ["child", "combined"].includes(supportFor) ? "Years 7 to 9 / KS3" : "", educationalStageOther: "", neurodivergence: [], neurodivergenceOther: "", difficulties: [], difficultiesOther: "" },
        parent: { household: [], householdOther: "", dailyImpact: "", dailyImpactOther: "", help: [], helpOther: "" }, additionalInformation: "",
        confirmations: { authorised: true, privacyAcknowledged: true, adultSpecialCategoryConsent: false, childSpecialCategoryConsent: false, childSpecialCategoryAuthority: false, learnerConsentRoute: "" },
    };
}
