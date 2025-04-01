/// <reference lib="webworker" />

import { Shard, InputGroup, InputRow } from '../models/sharded-input.model';

addEventListener('message', ({ data }) => {
  const { action, payload } = data;
  let result;

  switch(action) {
    case 'shardData':
      result = shardData(payload.groups, payload.shardSize);
      break;
    case 'getShard':
      result = getShard(payload.shardId, payload.shardSize, payload.groups);
      break;
    default:
      result = { error: 'Unknown action' };
  }

  postMessage(result);
});

function shardData(groups: InputGroup[], shardSize: number) {
  const rows: InputRow[] = groups.reduce((acc, group) => [...acc, ...group.rows], []);
  const totalRows = rows.length;
  const numberOfShards = Math.ceil(totalRows / shardSize);
  const shards: Shard[] = [];

  for (let shardId = 0; shardId < numberOfShards; shardId++) {
    const start = shardId * shardSize;
    const end = start + shardSize;
    const shardRows = rows.slice(start, end);

    const shardGroups: InputGroup[] = groups.map(group => ({
      groupName: group.groupName,
      rows: shardRows.filter(row => group.rows.some(gRow => gRow.id === row.id))
    })).filter(group => group.rows.length > 0);

    shards.push({ shardId, groups: shardGroups });
  }

  return shards;
}

function getShard(shardId: number, shardSize: number, groups: InputGroup[]) {
  const start = shardId * shardSize;
  const end = start + shardSize;
  const rows: InputRow[] = groups.reduce((acc, group) => [...acc, ...group.rows], []).slice(start, end);

  const shardGroups: InputGroup[] = groups.map(group => ({
    groupName: group.groupName,
    rows: rows.filter(row => group.rows.some(gRow => gRow.id === row.id))
  })).filter(group => group.rows.length > 0);

  return { shardId, groups: shardGroups };
}