---
layout: default
title: Overview
nav_order: 2
---

# Overview

{: .no_toc }

The 10,000ft view
{: .fs-6 .fw-300 }

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

---

View this site's [\_config.yml](https://github.com/Enterprise-CMCS/seatool-compare/tree/main/_config.yml) file as an example.

## Overview

The {{ site.repo.name }} project is a microservice which compares legacy data and seatool data and sends notifications when certain conditions are met. Alerting is leveraged through [AWS SES](https://aws.amazon.com/ses/) service.

## Archtecture

![Architecture Diagram](../../../assets/architecture.svg)

## View Metrics

[Metrics](https://Enterprise-CMCS.github.io/seatool-compare/dora/)
