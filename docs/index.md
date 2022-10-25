---
layout: default
title: Home
nav_order: 1
description: "The seatool-compare project is a serverless monorepo template.  It sets up projects the way we like them, and exists to get ideas from zero to deployed as fast as possible."
permalink: /
---

# seatool-compare
{: .fs-9 }

The seatool-compare project is a microservice compares legacy data and seatool data and sends notifications when certain conditions are met.
{: .fs-6 .fw-300 }

[Join us on Slack](https://cmsgov.slack.com/archives/C045M44HA0Y){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 } [View it on GitHub](https://github.com/cmsgov/seatool-compare){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## Welcome!

The seatool-compare project is a microservice compares legacy data and seatool data and sends notifications when certain conditions are met.

This project is under active development by the MACPRO Platform team.  Read on for more details, and feel free to join us on [Slack](https://cmsgov.slack.com/archives/C045M44HA0Y).

The purpose of this project is to compare each customer submitted record in MMDL against its government entered counterpart record in SEATOOL. This should perform similar comparisons logic n number of after the MMDL submission, and then again until needed. If comparisons come back with a negative result we send an email to interested parties. 

Thanks, and we're glad you're here!

---

## About the project

The seatool-compare project is a work of the MACPRO Platform Team for the [Centers for Medicare & Medicaid Services (CMS)](https://www.cms.gov/).


#### Thank you to the contributors of seatool-compare!

<ul class="list-style-none">
{% for contributor in site.github.contributors %}
  <li class="d-inline-block mr-1">
     <a href="{{ contributor.html_url }}"><img src="{{ contributor.avatar_url }}" width="32" height="32" alt="{{ contributor.login }}"/></a>
  </li>
{% endfor %}
</ul>
