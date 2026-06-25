#!/bin/bash
cd /root/automaton
node scripts/traffic-engine.mjs >> /tmp/traffic-engine.log 2>&1
node scripts/revenue-monitor.mjs >> /tmp/revenue-monitor.log 2>&1
