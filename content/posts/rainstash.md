---
title:      "rainstash"
date:       2020-11-27T17:50:15-05:00
lastmod:    2025-01-22T16:14:00-05:00
draft:      false
---

[rainstash](https://github.com/willjasen/rainstash) is an Amazon CloudFormation template for automating the setup of Resilio Sync in the Amazon cloud.

rainstash and Amazon CloudFormation is completely free to use, however, Amazon may charge for the use of resources created with rainstash. rainstash uses the following cost-related services: EC2, S3, and data transfer.

Due to technical and security considerations, rainstash by default only accepts encrypted read-only folder keys for the best security. That encrypted data itself resides on an encrypted virtual disk volume, but the instance is meant to be ephimeral. If the EC2 instance where rainstash is running is shutdown or rebooted, data on that instance is not trivially recoverable. The workaround - the BitTorrent protocol and Resilio Sync are meant to be decentralized and distributed. Always have more than one copy of your folders, whether it's multiple rainstash stacks or running on your own hardware. Please keep this in mind!

[![GitHub last commit](https://img.shields.io/github/last-commit/willjasen/rainstash)](https://github.com/willjasen/rainstash)

[![GitHub Repo stars](https://img.shields.io/github/stars/willjasen/rainstash)](https://github.com/willjasen/rainstash)

