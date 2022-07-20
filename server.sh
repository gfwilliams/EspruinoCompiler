#!/bin/bash

if [[ $EUID -eq 0 ]]; then
  echo "Root user not allowed!" 2>&1
  exit 1
fi

cd `dirname $0`

RUNNING=1
while [ $RUNNING ]; do
  rm -f *.elf *.cpp
  node server.js
  echo -------------------------------------------
  echo Server stopped - restarting...
  echo -------------------------------------------
  sleep 2s
done


