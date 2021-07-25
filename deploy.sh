#!/bin/bash
npm run build_node
PATH=/bin:/usr/bin
scp -P 22010 ./servBrain/index.js deton@46.4.77.138:/home/deton/nn