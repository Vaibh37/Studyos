#!/usr/bin/env bash
# This is a disposable CI drill, never a production restore command.
set -euo pipefail
[[ "${STUDYOS_BACKUP_DRILL:-}" == isolated-ci-only ]] || { echo 'Refusing backup drill outside isolated CI'; exit 1; }
# Hardcoded loopback MongoDB inside the dedicated ephemeral CI container.
base="mongodb://127.0.0.1:27017"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
prefix="studyos_drill_$(date +%s)_$$"
for area in study social; do
  src="${prefix}_${area}"
  dst="${src}_restored"
  mongosh "$base/$src" --quiet --norc --eval 'db.records.insertMany([{kind:"synthetic",value:1},{kind:"synthetic",value:2}]); db.records.createIndex({kind:1,value:1},{unique:true});' >/dev/null
  mongodump --uri="$base/$src" --archive="$work/$area.gz" --gzip >/dev/null 2>&1
  [[ -s "$work/$area.gz" ]]
  mongorestore --uri="$base" --archive="$work/$area.gz" --gzip --nsFrom="$src.*" --nsTo="$dst.*" --stopOnError >/dev/null 2>&1
  mongosh "$base/$dst" --quiet --norc --eval 'const docs=db.records.find({}, {_id:0}).sort({value:1}).toArray(); if (JSON.stringify(docs)!==JSON.stringify([{kind:"synthetic",value:1},{kind:"synthetic",value:2}])) quit(1); if(!db.records.getIndexes().some(i=>i.unique&&i.key.kind===1&&i.key.value===1)) quit(2);' >/dev/null
  echo "PASS isolated $area database dump/restore, document and index integrity"
done
