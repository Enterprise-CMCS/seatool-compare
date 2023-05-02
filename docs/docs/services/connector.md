---
layout: default
title: connector
parent: Services
nav_order: 2
---

# seatool

{: .no_toc }

#### Summary

This service inits an ECS Fargate kafka connect connector service to stream data from the relevant seatool, appain and mmdl topics into a sinkSeatoolData lambda, sinkAppianData and sinkMmdlData lambda respectively. This is a single container with two seperate tasks.

### Topics

The `aws.ksqldb.seatool.agg.State_Plan` topic is used to stream events to the sinkSeatoolData lambda which puts all events from the topic into the seatool dynamo table.

The `aws.ksqldb.mmdl.agg.PLAN_WVR_FLD_MPNG_TBL` topic is used to stream events to the sinkMmdlData lambda which puts all events from the topic into the mmdl dynamo table.

The `aws.appian.cmcs.MCP_SPA_PCKG` topic is used to stream events to the sinkAppianData lambda which puts all events from the topic into the appian dynamo table.

Records are overwritten with new ones as they represent the most current representation of the data.

### Alarms

Several metrics and alarms were added to monitor this connector service.

- ECS Failure alarm - monitors the general health of the ECS container. If the instance reports a status of 'STOPPED' it will be reported to the alerts sns topic.
- Connector - The [nordstrom kafka connector](https://github.com/Nordstrom/kafka-connect-lambda) health (checked every minute by the testConnectors lambda)
- Connector Task - The nordstrom kafka connector task health (checked every minute by the testConnectors lambda)
- Seatool data sink metric alarm - if the sink function evers fails an alarm will be triggered

#### Functions

There are four functions that help to facilitate this service

- configureConnectors - this function facilitates the connection of the nordstrom kafka connector and the kafka broker i.e [bigmac](https://github.com/Enterprise-CMCS/bigmac)
- testConnectors - this function can be called by hand to test the connectors and connector task health. This function also runs every minute on a crom job and reports the health status to the `${self:service}-${sls:stage}.lambda.seatoolData` and `${self:service}-${sls:stage}.lambda.seatoolData` metric name.
- sinkSeatoolData - this function recieves events from the `aws.ksqldb.seatool.agg.State_Plan` topic as single events reprenting the statuc of the state plan after a change. This function uses http put events to update the seatool dynamoDb table with these changes.
- sinkMmdlData - this function recieves events from the `aws.ksqldb.mmdl.agg.PLAN_WVR_FLD_MPNG_TBL` topic as single events reprenting the status of the state plan after a change. This function uses http put events to update the mmdl dynamoDb table with these changes.
- sinkAppianData - this function recieves events from the `aws.appian.cmcs.MCP_SPA_PCKG` topic as single events reprenting the submission of appian records after a change. This function uses http put events to update the appian dynamoDb table with these changes.
