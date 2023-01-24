---
layout: default
title: compare
parent: Services
nav_order: 5
---

# compare

{: .no_toc }

#### Summary

The compare service is the most involved service. This makes sense, as it holds the real business logic and value for the project. This state machine is the object that has a definition of tasks to run, when to run them, and their relationships. This is essentially a workflow definition in code, following AWS StepFunction definition syntax.

The basic logic of the compare service is as follows:

the wokflowStarter lambda has an mmdl stream which receives all change events to the mmdl table. this function retrieves the mmdl item, uses the getMmdlInfoFromRecord util to determine if the record has been signed and if so, how long ago. If the record has not been signed yet or if its older than 250 days, the function ignores the record. Otherwise it starts the compare state machine with the record id as input.

The state machine is kicked off with the initStatus function which initializes a record in the status table.
The service then waits for a time determined using stage params. These params use second units and are identical for higher environments but use smaller increments for default branches to allow for a more immediate feedback loop when testing.

After the initialWait the mmdl record is retrieved from the mmdl dynamo table, we check to see if a seatool record exists for the same id, if one exists we compare the records to see if they were both signed on the same date, if not an email is sent to the recipients defined by the values returned from secrets manager indicating that no match has been found.

If no seatool record is found with a matching id, an email indicating no record exists is sent in the same manner.

The record is then updated in the status table to reflect the new data, and if the record is now older than 250 days and is signed, it is considered successful, if not 250 days old it will go into a waiting stage and cycle through the machine again. Eventually the record will be older than 250 days old and be a match or will fail.

#### Functions

- `workflowStarter` its trigger is set to be the mmdl service’s dynamo stream. In this way, when a new mmdl record arrives, this function will determine if the record has been signed and the record had been signed within 250 days in the table the workflow creator is triggered.
- `initStatus` puts initial record to the status table with iterations value set to 0.
- `getMmdlData` gets mmdl record and extracts signature date and program type to be used in comparison.
- `seatoolRecordExist` gets seatool item using id. checks if seatoolItem exists.
- `sendNotExistAlert` checks if secrets exist for that stage. uses that secret value to define recipients for SES Alert. Sends does not exist alert. `putsLogEvent` logs that an email should be or would be sent for event.
- `sendNoMatchAlert` checks if secrets exist for that stage. uses that secret value to define recipients for SES Alert. Sends does not match alert. `putsLogEvent` logs that an email should be or would be sent for event.
- `compare` compares date values from mmdl and seatool record and sets "match" value of event data.
- `updaeStatus` updates status table with state machine data and updates interations value by 1.

#### Alerting
- The `sendNotExistTask` and `sendNoMatchTask` functions handle the email notifications. They use the `secret-manager-lib` to get the list of recipient and source emails from secrets manager, defines the email content and initiates email sending via the [AWS SES](https://aws.amazon.com/ses/) service.
- the email recipients and source email should be stored in secrets manager under the secret name: `[project-name]/[stage-name]/alerts` with the secret value formatted as follows:

```
{
    "emailRecipients":
        ["recipient@example.com"],
    "sourceEmail":"source@example.com"
}
```
