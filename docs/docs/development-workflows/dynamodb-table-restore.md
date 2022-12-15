---
layout: default
title: PITR Dynamodb Backup Restore
parent: Development Workflows
nav_order: 6
---

# Point in time recovery(PITR) 
{: .no_toc }

How-to to restore dynamodb table from point in time recovery(PITR).
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

- TOC
{:toc}

---

### Point In Time Recovery

#### Summary
This Project uses Point In Time Recovery for backing up dynamodb tables. This document outlines the steps to restore a dynambd table to a specific point in time. The idea is to recover the table to a diffferent name, delete the original table and recover the new table to the original table name.


#### Prerequisites:
- Enable PITR on all dynamodb tables

#### Table Restore steps
## Step 1 :Restore table orignal table(A) to table B
- Go to the AWS Console
- Choose your region in the top right drop down.
- Navigate to dynamodb service dashboard
- Click tables on the left pane
- Click on the table you want to restore (Table A)
- Click  backups
- Click Restore
- Enter new table name(Table B)
- Specify Date and Time to recover to
- Secondary indexes: Restore the entire table
- Destination AWS Region: Select same region
- Encryption key management: Select Owned by Amazon DynamoDB or your preferred choice
- Click on restore
- Wait for table to be fully restored and check for total item count.

## Step 2: Delete table A
- Click on Table on the left pane to navigate to the main dashboard
- Select table A
- Click on Delete
- Seclect both Delete all CloudWatch alarms for this table and Create a backup of this table before deleting it.
- Type in the word "delete" in the text box
- Click on Delete table


## Step 3: Restore table B back to table A
- Repeat step 1 to restore table B back to table A using the original table A name.
- Check for total item count. 

## Step 4: Delete Table B
- Repeat step 2 to delete table B





