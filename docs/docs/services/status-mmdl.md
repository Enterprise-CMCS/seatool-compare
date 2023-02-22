---
layout: default
title: status-mmdl
parent: Services
nav_order: 6
---

# status

{: .no_toc }

#### Summary

- The status service consists of a single dynamodb table
- This table is updated from `services/compare/handlers/initStatus` and `services/compare/handlers/updateStatus` to track records as they cycle/traverse the compare step functions workflow. 

#### Fields
- There several possible fields for these records:
  - `id: string` ID - id of the mmdl record they reference. 
  - `iterations: number` - number of times the record has gone through the workflow.
  - `mmdlSigned: boolean` - Signaature state of the mmdl record.
  - `mmdlSigDate: string` (ex: 'DD/MM/YYYY') - Date mmdl record was signed.
  - `seatoolExist: boolean` - If corresponding seatool record exists for mmdl record.
  - `seatoolSigDate: string` (ex: 'DD/MM/YYYY') - Date seatool record was signed.
  - `match: boolean` - denoting whether a seatool match was identified.
  - `programType: string` (ex. 'MAC' 'CHP' 'HHS') - the type of program record.
  - `secSinceMmdlSigned: number` - seconds since mmdl was signed.
  - `mmdlRecord: MmdlRecord` - as it exists from the mmdl table.
  - `seatoolRecord: SeaToolRecord` - as it exists from the seatool table.

