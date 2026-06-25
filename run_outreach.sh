#!/bin/bash
cd /root/automaton
python3 outreach_engine.py >> /var/log/outreach.log 2>&1
