import { z } from "zod";

export const intakeSchema = z.object({ matterId: z.string().min(1), clientEmail: z.string().email(), signedDocumentUrl: z.string().url(), deadline: z.string().datetime() });
export type MatterIntake = z.infer<typeof intakeSchema>;

export function notificationPayload(intake: MatterIntake) {
  return { matterId: intake.matterId, recipients: [intake.clientEmail], event: "signed-document-delivery", documentUrl: intake.signedDocumentUrl, deadline: intake.deadline };
}
