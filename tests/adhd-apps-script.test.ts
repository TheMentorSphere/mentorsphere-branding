import { describe } from "vitest";
import { isolatedStorageTests } from "./isolated-storage-contract";
import { validAdhdRequest } from "./adhd-fixtures";
import { section } from "./secondary-fixtures";
describe("ADHD isolated Apps Script durable storage", () => isolatedStorageTests("adhd-coaching-intake", validAdhdRequest, 53, input => {
    section(input, "confirmations").adultSpecialCategoryConsent = true;
    section(input, "adult").adhdStatus = "Self-identified / suspected";
}));
