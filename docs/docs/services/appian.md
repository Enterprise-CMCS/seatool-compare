---
layout: default
title: appian
parent: Services
nav_order: 3
---

# appian

{: .no_toc }

#### Summary

- Appian data will be available to this service from CMS Bigmac, in a single topic, with events keyed off the record’s PCKG_ID as the partition key. This data will be sinked to an appian DyanmoDB table in this service.

- A DynamoDB Stream should be created as part of the appian service, which will be how the comparison service's lambda is triggered.

#### Notes
