import assert from "node:assert/strict";
import { intakeSchema, notificationPayload } from "../src/domain.js";

const intake = intakeSchema.parse({ matterId: "MAT-1", clientEmail: "a@b.com", signedDocumentUrl: "https://example.com/signed.pdf", deadline: "2026-10-01T17:00:00.000Z" });
assert.deepEqual(notificationPayload(intake), { matterId: "MAT-1", recipients: ["a@b.com"], event: "signed-document-delivery", documentUrl: "https://example.com/signed.pdf", deadline: "2026-10-01T17:00:00.000Z" });
assert.throws(() => intakeSchema.parse({ ...intake, clientEmail: "bad" }));
console.log("domain decision passed");
