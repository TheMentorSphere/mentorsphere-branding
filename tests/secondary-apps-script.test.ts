import { describe } from "vitest";
import { LEARNER_CONSENT_ROUTES } from "../src/intake/validation";
import { isolatedStorageTests } from "./isolated-storage-contract";
import { validSecondaryRequest, section } from "./secondary-fixtures";
describe("Secondary isolated Apps Script durable storage", () => isolatedStorageTests("secondary-learner-profile", validSecondaryRequest, 52, input => {
    Object.assign(section(input, "supportProfile"), { specialCategoryProvided: true, supportNeeds: "Fictional needs" });
    Object.assign(section(input, "confirmations"), { specialCategoryConsent: true, specialCategoryAuthority: true, learnerConsentRoute: LEARNER_CONSENT_ROUTES[0] });
}));
