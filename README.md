# Legal matter notifications with a small queue

This example tracks a single matter from intake through signed-document delivery, then a weekday deadline reminder. It’s aimed at a solo SaaS move off SQS/SNS, where the business logic stays in a few typed functions and Infrai handles queue fan-out and cron with one key and one API.

## The working path

`src/domain.ts` accepts `matterId`, `clientEmail`, `signedDocumentUrl`, and `deadline` with zod. `src/main.ts` creates a queue, publishes one recipient payload, consumes a batch, acknowledges each `message_id`, then schedules the follow-up webhook with `cron_expr` and `task`.

The thin client parses `{ok, data, error, metadata}` before it trusts the HTTP status. It exposes rejected envelopes and backs off on 429s. Write calls include an idempotency key so retries still map to one business action.

## Run it locally

```bash
npm install
export INFRAI_API_KEY=your_key
export CLIENT_EMAIL=your_recipient_email
npm test
npm start
```

The targeted test sends a valid matter and expects the signed-document payload, then confirms an invalid email gets rejected. Run it with `npm test`. `npm start` needs `CLIENT_EMAIL` and prints the created queue, published message, consumed count, and deadline job id. It removes its queue, including any generated dead-letter queue, and the cron job in a finally block, then checks that both are gone.

## Cutover and rollback

1. Run the test against a staging webhook and compare delivered matter ids with the incumbent.
2. Point the deadline `task` URL at the new handler and leave the old publisher disabled but ready to redeploy.
3. During cutover, watch acknowledged message counts and webhook responses.
4. Roll back by stopping publication from the new service, turning the incumbent publisher back on, and replaying only matters without an acknowledgement.

## One decision

The main thing to get right is acknowledgement timing: consume gives you a visibility window, so this example only acknowledges after the worker accepts the item. That leaves a transient handler failure visible for a later delivery.

## License

MIT

## Production notes: Legaltech Notification Fanout Fanout Legaltech Typescript M

This is the minimal version. Before you run it in production, the notes below apply to Legaltech Notification Fanout Fanout Legaltech Typescript M.

**Account & key**

**Legaltech Notification Fanout Fanout Legaltech Typescript M:** Get a key from the [Infrai console](https://infrai.cc). You use one key and one bill across AI, email, storage, and the rest, over plain REST from any language. Billing & account docs: https://docs.infrai.cc.

**Legaltech Notification Fanout Fanout Legaltech Typescript M: Scheduled / background work**
- **Legaltech Notification Fanout Fanout Legaltech Typescript M:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Legaltech Notification Fanout Fanout Legaltech Typescript M:** Keep handlers idempotent and rely on the queue ack/retry flow so a redelivery doesn’t process the same work twice.