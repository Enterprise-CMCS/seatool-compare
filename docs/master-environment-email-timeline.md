# Email Alert Timing Architecture

This document describes the email notification timing behavior for the Appian-SEATool comparison workflow across all environments.

## Overview

When an Appian record is submitted but no matching SEATool record exists, the system sends alert emails. The timing behavior differs between environments to support different use cases.

## Environment Comparison

| Environment | Time Measurement | First Check | Email Interval | First Email | Urgent Email |
|-------------|------------------|-------------|----------------|-------------|--------------|
| **master** | System time (`eligibleAt`) | 10 min after eligibility | Every 20 min | ~30 min | ~70 min |
| **val** | Appian date (`SBMSSN_DATE`) | 8am EST, 2 days later | Every 2 days | 3+ days | 5+ days |
| **production** | Appian date (`SBMSSN_DATE`) | 8am EST, 2 days later | Every 2 days | 3+ days | 5+ days |

---

## Master Environment (Development)

### Purpose

Fast feedback loop for testing. Uses **system time** at the moment the record becomes eligible.

### Configuration

```yaml
master:
  skipWait: true                   # Start checking 10 min from now
  sinceSubmissionChoiceSec: 1200   # 20 minutes (threshold to send first email)
  tempWaitSec: 1200                # 20 minutes between checks
  isUrgentThresholdSec: 4200       # 70 minutes (threshold for urgent emails)
  recordAgeChoiceSec: 86400        # 1 day (stop alerting after 24 hours)
```

### How Timing Works

1. **Record becomes eligible** when `workflowStarter` detects:
   - `SBMSSN_TYPE` = "official"
   - `SPA_PCKG_ID` ends with "o"
   - Record less than 201 days old

2. **`eligibleAt = Date.now()`** is captured at this moment

3. **Time calculations** use `eligibleAt` (not Appian dates):

   ```typescript
   secSinceAppianSubmitted = Math.floor((Date.now() - eligibleAt) / 1000)
   ```

### Expected Timeline

```
Time                    Event
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
T+0 min     Record eligible → eligibleAt captured → Workflow starts
            │
T+10 min    First check
            │ secSinceAppianSubmitted = 10 min = 600 sec
            │ 600 < 1200 (threshold) → NO EMAIL
            │
            │  ⏳ 20 minute wait
            │
T+30 min    Second check
            │ secSinceAppianSubmitted = 30 min = 1800 sec
            │ 1800 >= 1200 → SEND EMAIL
            │ 1800 < 4200 → NOT urgent
            │
            │  ✉️ FIRST EMAIL (non-urgent)
            │
            │  ⏳ 20 minute wait
            │
T+50 min    Third check
            │ secSinceAppianSubmitted = 50 min = 3000 sec
            │ 3000 >= 1200 → SEND EMAIL
            │ 3000 < 4200 → NOT urgent
            │
            │  ✉️ Second email (non-urgent)
            │
            │  ⏳ 20 minute wait
            │
T+70 min    Fourth check
            │ secSinceAppianSubmitted = 70 min = 4200 sec
            │ 4200 >= 1200 → SEND EMAIL
            │ 4200 >= 4200 → URGENT
            │
            │  🚨 FIRST URGENT EMAIL
            │
            │  (continues every 20 min with urgent emails)
```

---

## Val/Production Environments

### Purpose

Production-grade alerting with batched daily emails at a specific time (8am EST).

### Configuration

```yaml
val/production:
  skipWait: false                   # Wait until 8am EST, 2 days from now
  sinceSubmissionChoiceSec: 259200  # 3 days (threshold to send first email)
  tempWaitSec: 172800               # 2 days between checks
  isUrgentThresholdSec: 432000      # 5 days (threshold for urgent emails)
  recordAgeChoiceSec: 17366000      # ~201 days (stop alerting)
```

### How Timing Works

1. **Record becomes eligible** (same criteria as master)

2. **Workflow waits** until 8am EST (12:00 UTC), 2 days from submission

3. **Time calculations** use `SBMSSN_DATE` from Appian:

   ```typescript
   secSinceAppianSubmitted = secondsBetweenDates(appianRecord.payload.SBMSSN_DATE)
   ```

### Expected Timeline

```
Day         Event
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Day 0       Record submitted in Appian (SBMSSN_DATE set)
            Workflow starts, waits until Day 2 at 8am EST
            │
Day 2       First check at 8am EST
8am EST     │ secSinceAppianSubmitted = ~2 days
            │ 2 days < 3 days (threshold) → NO EMAIL
            │
            │  ⏳ 2 day wait
            │
Day 4       Second check at 8am EST
8am EST     │ secSinceAppianSubmitted = ~4 days
            │ 4 days >= 3 days → SEND EMAIL
            │ 4 days < 5 days → NOT urgent
            │
            │  ✉️ FIRST EMAIL (non-urgent)
            │
            │  ⏳ 2 day wait
            │
Day 6       Third check at 8am EST
8am EST     │ secSinceAppianSubmitted = ~6 days
            │ 6 days >= 3 days → SEND EMAIL
            │ 6 days >= 5 days → URGENT
            │
            │  🚨 FIRST URGENT EMAIL
```

---

## Email Content

Email content is generated by `handlers/utils/getEmailContent.ts`.

### Non-Urgent Email

**Subject:** `[SPA_ID] - ACTION REQUIRED - No matching record in SEA Tool`

**Body:**
```
This is a reminder that there's no matching record in SEA Tool for [SPA_ID].

Either a record wasn't created in SEA Tool, or the SPA ID in Appian 
and SEA Tool don't match.
```

### Urgent Email

**Subject:** `[SPA_ID] - ACTION REQUIRED - No matching record in SEA Tool`

**Body:**
```
This is an urgent reminder that there's no matching record in SEA Tool for [SPA_ID].

Either a record wasn't created in SEA Tool, or the SPA ID in Appian 
and SEA Tool don't match.

Failure to address this could lead to critical delays in the review 
process and a deemed approved SPA action.
```

### CC Recipients (Conditional)

The alerts secret (`compare/{stage}/alerts-appian`) supports conditional CC recipients based on time elapsed:

```json
{
  "CcAddresses": [
    {
      "email": "escalation@example.com",
      "alertIfGreaterThanSeconds": 345600
    }
  ]
}
```

Recipients in `CcAddresses` are only included when `secSinceAppianSubmitted >= alertIfGreaterThanSeconds`.

---

## Technical Implementation

### Key Files

| File | Purpose |
|------|---------|
| `handlers/workflowStarter.ts` | Captures `eligibleAt` timestamp when record becomes eligible |
| `handlers/getStartAtTimeStamp.ts` | Sets initial wait time (10 min for master, 8am EST +2 days for val/prod) |
| `handlers/getAppianData.ts` | Calculates `secSinceAppianSubmitted` using `eligibleAt` (master) or `SBMSSN_DATE` (val/prod) |
| `handlers/sendNoMatchAlert.ts` | Determines urgent flag based on `isUrgentThresholdSec`, sends email via SES |
| `handlers/utils/getEmailContent.ts` | Generates HTML/text email content based on `isUrgent` flag |

### Flow Diagram

```
┌─────────────────────┐
│   DynamoDB Stream   │
└──────────┬──────────┘
           │ Record inserted
           ▼
┌─────────────────────┐
│   workflowStarter   │ ← Captures eligibleAt = Date.now()
└──────────┬──────────┘
           │ Starts Step Function
           ▼
┌─────────────────────┐
│ getStartAtTimeStamp │ ← Sets initial wait (10min or 2days)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    InitialWait      │ ← Waits until startAtTimeStamp
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   getAppianData     │ ──► │ Master: Date.now()  │
│                     │     │         - eligibleAt│
│                     │     ├─────────────────────┤
│                     │     │ Val/Prod: SBMSSN_DATE│
└──────────┬──────────┘     └─────────────────────┘
           │ secSinceAppianSubmitted
           ▼
┌─────────────────────┐
│ SinceSubmissionChoice│ ← >= sinceSubmissionChoiceSec?
└──────────┬──────────┘
           │ Yes
           ▼
┌─────────────────────┐
│  sendNoMatchAlert   │ ← isUrgent = secSinceAppianSubmitted >= isUrgentThresholdSec
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      TempWait       │ ← Loop back after tempWaitSec
└─────────────────────┘
```

---

## Summary Table

| Metric | Master | Val | Production |
|--------|--------|-----|------------|
| Time basis | System clock (`eligibleAt`) | Appian (`SBMSSN_DATE`) | Appian (`SBMSSN_DATE`) |
| Initial wait | 10 minutes | 2 days to 8am EST | 2 days to 8am EST |
| Check interval | 20 minutes | 2 days | 2 days |
| First email threshold | 20 minutes | 3 days | 3 days |
| Urgent threshold | 70 minutes | 5 days | 5 days |
| Stop alerting after | 24 hours | ~201 days | ~201 days |
| First email | ~30 min | ~Day 4 | ~Day 4 |
| First urgent | ~70 min | ~Day 6 | ~Day 6 |

## Alerting Stop Condition

The workflow stops alerting based on `recordAgeChoiceSec`:

- **Master**: Stops after 24 hours (`86400` seconds) - prevents endless alerting in dev
- **Val/Production**: Stops after ~201 days (`17366000` seconds) - aligns with record eligibility criteria

When the workflow detects `secSinceAppianSubmitted >= recordAgeChoiceSec`:
- If a SEATool match was eventually found → **Success state**
- If no match was ever found → **Fail state** (workflow ends without further action)

---

*Last Updated: December 2025*

## Related Documentation

- [environment-migration-guide.md](./environment-migration-guide.md) - Deployment and infrastructure guide
