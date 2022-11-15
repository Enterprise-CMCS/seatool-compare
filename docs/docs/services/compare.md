---
layout: default
title: compare
parent: Services
nav_order: 5
---

# compare

{: .no_toc }

#### Summary

- The compare service is the most involved service. This makes sense, as it holds thereal business logic and value for the project.
- This state machine is the object that has a definition of tasks to run, when to run them, and their relationships. This is essentially a workflow definition in code, following AWS StepFunction definition syntax.
- The Step Function’s definition in this service will be configured to align with the business needs. At four days past submission (s+4), the step function should trigger a lambda function to perform the comparison, send an email via SES if records don’t match across systems, wait another two days, and repeat the comparison. This record parity check will continue every two days until the original submission is 90 days old.

#### Functions

- A lambda function, called workflowStarter, is built. Its trigger is set to be the mmdl service’s dynamo stream. In this way, when a new mmdl record arrives in the table, the workflow creator is triggered.
- The compare lambda function compares data from the two dynamo tables and performs the logic to see if a matching record exists.
- The sendAlert function handles the email notifications. It gets the list of recipient and source emails from secrets manager, defines the email content and initiates email sending via the [AWS SES](https://aws.amazon.com/ses/) service.
- the email recipients and source email should be stored in secrets manager under the secret name: `[project-name]/[stage-name]/alerts` with the secret value formatted as follows:

```
{
    "emailRecipients":
        ["recipient@example.com"],
    "sourceEmail":"source@example.com"
}
```

#### Notes
