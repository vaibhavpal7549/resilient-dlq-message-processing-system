# DLQ Replay Mechanism

## Bash Scripts

- [replay-single-dlq.sh](/d:/dlq/scripts/replay-single-dlq.sh:1)
- [replay-all-failed-dlq.sh](/d:/dlq/scripts/replay-all-failed-dlq.sh:1)
- [resolve-dlq-message.sh](/d:/dlq/scripts/resolve-dlq-message.sh:1)

## Node.js CLI Helper

The scripts call [dlq-cli.js](/d:/dlq/scripts/dlq-cli.js:1).

Supported commands:

- `replay-one <mongoId>`
- `replay-failed`
- `resolve <mongoId> [resolvedBy] [notes]`

## Safety Checks

Duplicate replay prevention is enforced in the CLI helper:

- messages in `dlq_processing` cannot be replayed
- messages in `dlq_replayed` cannot be replayed again
- messages in `dlq_resolved` cannot be replayed
- messages with an existing replay attempt whose result is `replayed` are skipped

## Usage Examples

Replay one message by MongoDB document ID:

```bash
bash scripts/replay-single-dlq.sh 66181ca9f8c3f5eb4d102001
```

Replay all `dlq_failed` messages:

```bash
bash scripts/replay-all-failed-dlq.sh
```

Mark a message as resolved:

```bash
bash scripts/resolve-dlq-message.sh 66181ca9f8c3f5eb4d102001 ops-team "Issue fixed in downstream service"
```
