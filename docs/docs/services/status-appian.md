---
layout: default
title: status-appian
parent: Services
nav_order: 6
---

# status-appian

{: .no_toc }

#### Summary

- The status-appian service consists of a single dynamodb table
- This table is updated from `services/compare-appian/handlers/initStatus` and `services/compare-appian/handlers/updateStatus` to track records as they cycle/traverse the compare step functions workflow. 

#### Fields
- There several possible fields for these records:
  - `id: string` ID - id of the mmdl record they reference. 
  - `SPA_ID: string` SPA_ID - id of the SPA_ID record they reference, should match SEATool.id. 
  - `iterations: number` - number of times the record has gone through the workflow.
  - `isAppianSubmitted: boolean` - submitted state of appian data.
  - `seatoolExist: boolean` - If corresponding seatool record exists for mmdl record.
  - `seatoolSubmissionDate: string` (ex: 'DD/MM/YYYY') - Date seatool record was signed.
  - `match: boolean` - denoting whether a seatool match was identified.
  - `appianSubmittedDate: number` - seconds since appian was signed.
  - `appianRecord: AppianRecord` - as it exists from the appian table.
  - `seatoolRecord: SeaToolRecord` - as it exists from the seatool table.

