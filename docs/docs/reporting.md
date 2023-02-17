---
layout: default
title: Sending Reports
nav_order: 6
---

# Reporting
{: .no_toc }

Sending one-off reports containing csv of current program status. 
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

- TOC
{:toc}

## Usage
You may be required or find it useful to send an emailed report listing the current status of the records and their respective seatool items. A sendReport function was added within the mmdl-compare & appian-compare services that extracts comparison data, formats the data into csv, and sends an email via SES with the csv file as an attachment just for this purpose.

The easiet way to trigger this functionality is by using the 'test' functionality of the lambda within the AWS console itself. You can find the lambda in the respective environment/stage you wish to create a report for and execute a test event using custom event json values in the following format:
```
{ "recipient": "user@example.com" }
```
or invoke the function with the AWS CLI passing in an event using the payload flag:
`--payload '{ "recipient": "user@example.com" }'`

NOTE: An email recipient must be specified when triggering the lambda or the email will not be sent.

The sender of these emails is "noreply@cms.hhs.gov" which has been listed as an approved domain in SES.