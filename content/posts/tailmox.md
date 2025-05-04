---
title: "tailmox"
date: 2025-05-04T18:45:44-04:00
draft: false
---

[tailmox](https://github.com/willjasen/tailmox) facilitates setting up proxmox v8 hosts in a cluster that communicates over tailscale. why would one wanna do this? it allows hosts to be in a physically separate location yet still perform some cluster functions.

my experience in running with this kind of architecture for about a year within my own environment has encountered minimal issues that i’ve been able to easily workaround. at one point, one of my clustered hosts was located in the european union, while i am in america.

i will preface that while my testing of tailmox with three freshly installed proxmox hosts has been successful, the script is not guaranteed to work in all instances, especially if there are prior extended configurations of the hosts. please keep this in mind when running the script within a production environment (or just don’t).

i will also state that discussion replies here centered around asking questions or explaining the technical intricacies of proxmox and its clustering mechanism of corosync are welcome and appreciated. replies that outright dismiss this as an idea altogether with no justification or experience in can be withheld, please.

the github repo is at: https://github.com/willjasen/tailmox