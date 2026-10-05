# PrintFlow — Production Deployment & Instant Rollback Playbook

## 1. Overview & Rollback Architecture

PrintFlow leverages Vercel's **Instant Rollback** capability combined with PostgreSQL backward-compatible migrations to achieve near-zero downtime recovery from bad production releases.

| Metric | Target | Realized Protocol |
|---|---|---|
| **Rollback Trigger Latency** | **< 30 seconds** | 1-Click Vercel Dashboard Instant Rollback or CLI command |
| **Traffic Cutover Time** | **< 2 seconds** | Edge Routing Instant Traffic Switch |
| **Migration Backward-Compatibility** | **N-1 Safe** | Expand/Contract pattern: No column drops or renames without deprecation window |

---

## 2. Designating `isRollbackCandidate` Deployments

In Vercel, every successful production deployment that passes automated health checks is automatically designated as an active rollback candidate:

1. **Pre-flight Gate Verification:**
   - `npm run typecheck` (0 errors across 613 files)
   - `npm run ui-audit` (0 violations)
   - `npm run security-grep` (0 violations)
   - `npm run check:migrations` (0 dangerous grants)
   - `npm run test` (Core acceptance, security, and integration suites)
2. **Post-Deployment Health Probe:**
   - Synthetic check against `https://app.printflow.bd/api/health` confirming `dbStatus === 'ok'` and `queueStatus === 'ok'`.
3. **Rollback Marker:**
   - Once verified for 15 minutes with error rate < 0.1%, deployment is confirmed as the target `isRollbackCandidate`.

---

## 3. Instant Rollback Execution Sequence

When an urgent production regression is detected (unhandled runtime exceptions, severe latency degradation, or critical workflow break):

### Step 1: Trigger Rollback via CLI or Dashboard

```bash
# Option A: Fast Vercel CLI Rollback to preceding verified deployment
vercel rollback --prod

# Option B: Rollback to specific deployment ID
vercel rollback dpl_xxxxxxxxxxxx --prod
```

Or via **Vercel Dashboard** $\to$ **PrintFlow Project** $\to$ **Deployments** $\to$ Select previous healthy deployment $\to$ Click **Instant Rollback**.

### Step 2: Traffic Re-Routing Verification
- Vercel Edge immediately routes 100% of incoming domain traffic to the previously healthy build artifacts.
- Zero rebuilding or recompilation occurs during instant rollback.

### Step 3: Database Compatibility Safeguard
- Because PrintFlow enforces the **Expand/Contract** database schema convention, the prior application version remains 100% compatible with the existing database schema.
- Schema changes never drop active columns or break backward compatibility in the same release.

### Step 4: Incident Post-Mortem & Fix-Forward
- Post an incident notice to the Platform Status Page.
- Replicate the bug in a local ephemeral database branch.
- Prepare, test, and promote a fix-forward release.
