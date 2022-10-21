---
layout: default
title: seatool
parent: Services
nav_order: 3
---

# seatool
{: .no_toc }

#### Summary

- SEATOOL data will be available to this service from CMS Bigmac, in a single topic, this data will be sinked to a DyanmoDB table in this service.
- Any amount of transformation can occur in this stage, as the logic is directly in our control. We know we need the State Plan ID, as that is what we use to identify the record in this use case; and we recommend that State Plan ID be the partition key. The sort key and any secondary indexes, as well as the comprehensive list of attributes that we would like to match against, is left to be decided at a future point. 

#### Notes
