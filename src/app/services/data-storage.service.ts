import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Shard, ShardedInputGroups, InputGroup, InputRow } from '../models/sharded-input.model';

interface MyDB extends DBSchema {
  'input-shards': {
    key: number;
    value: Shard;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DataStorageService {
  private dbPromise: Promise<IDBPDatabase<MyDB>>;

  constructor() {
    this.dbPromise = openDB<MyDB>('my-database', 1, {
      upgrade(db) {
        db.createObjectStore('input-shards', { keyPath: 'shardId' });
      }
    });
  }

  async addShard(shard: Shard): Promise<void> {
    const db = await this.dbPromise;
    await db.put('input-shards', shard);
  }

  async getShard(shardId: number): Promise<Shard | undefined> {
    const db = await this.dbPromise;
    return await db.get('input-shards', shardId);
  }

  async shardData(groups: InputGroup[], shardSize: number): Promise<void> {
    const rows: InputRow[] = groups.reduce((acc, group) => [...acc, ...group.rows], []);
    const totalRows = rows.length;
    const numberOfShards = Math.ceil(totalRows / shardSize);

    for (let shardId = 0; shardId < numberOfShards; shardId++) {
      const start = shardId * shardSize;
      const end = start + shardSize;
      const shardRows = rows.slice(start, end);

      const shardGroups: InputGroup[] = groups.map(group => ({
        groupName: group.groupName,
        rows: shardRows.filter(row => group.rows.some(gRow => gRow.id === row.id))
      })).filter(group => group.rows.length > 0);

      const shard: Shard = { shardId, groups: shardGroups };
      await this.addShard(shard);
    }
  }
}