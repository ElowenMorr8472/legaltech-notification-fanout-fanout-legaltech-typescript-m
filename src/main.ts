import { infrai } from "./infrai.js";
import { intakeSchema, notificationPayload } from "./domain.js";

const intake = intakeSchema.parse({ matterId: "MAT-1042", clientEmail: process.env.CLIENT_EMAIL, signedDocumentUrl: "https://files.example.com/mat-1042/signed.pdf", deadline: "2026-10-01T17:00:00.000Z" });
const queueName = `legal-notifications-${crypto.randomUUID()}`;
let queue: Awaited<ReturnType<typeof infrai.queue.create>> | undefined;
let cron: Awaited<ReturnType<typeof infrai.cron.create>> | undefined;
try {
  queue = await infrai.queue.create(queueName);
  const message = await infrai.queue.publish(queueName, notificationPayload(intake), `matter-${queueName}`);
  const consumed = await infrai.queue.consume(queueName, 10, 60);
  for (const item of consumed.items ?? []) await infrai.queue.ack(queueName, item.message_id);
  cron = await infrai.cron.create("0 9 * * 1-5", "https://example.com/hooks/legal-deadline", `deadline-${queueName}`);
  console.log({ queue, published: message.message_id, consumed: consumed.items?.length ?? 0, followUpJob: cron.job_id });
} finally {
  const cleanup = await Promise.allSettled([
    (async () => {
      if (!cron) return;
      await infrai.cron.delete(cron.job_id);
      if ((await infrai.cron.list()).some((item) => item.job_id === cron!.job_id)) throw new Error(`Cron deletion not verified: ${cron.job_id}`);
      console.log({ deletedCron: cron.job_id, verified: true });
    })(),
    (async () => {
      if (!queue) return;
      const names = [queueName, ...(queue.dlq_name ? [queue.dlq_name] : [])];
      for (const name of names) await infrai.queue.delete(name);
      const remaining = await infrai.queue.list();
      if (remaining.some((item) => names.includes(item.name))) throw new Error(`Queue deletion not verified: ${names.join(", ")}`);
      console.log({ deletedQueues: names, verified: true });
    })()
  ]);
  const failures = cleanup.filter((result) => result.status === "rejected");
  if (failures.length) throw new AggregateError(failures.map((result) => result.reason), "Demo cleanup failed");
}
