---
layout: default
title: mmdl
parent: Services
nav_order: 2
---

# mmdl
{: .no_toc }

#### Summary

- MMDL data will be available to this service from CMS Bigmac, in a single topic, with events keyed off the record’s transmittal ID.  This data will be sinked to an mmdl DyanmoDB table in this service.
- The partition key should be the Transmittal ID of the MMDL record.
- A DynamoDB Stream should be created as part of the mmdl service, which will be how the comparison service's lambda is triggered.

#### Notes
