# Angular Component with Grouped Inputs and Pagination

## Introduction
This document provides a comprehensive guide on designing an Angular component that displays rows of inputs grouped by a group name. It includes pagination based on the number of rows and shows them in a grouped view with the group name displayed above the input rows within each group. The document also details how to store the data in IndexedDB using a sharded approach for efficient data management.

## Data Structure

### InputRow
Represents a single row of inputs.

```typescript
export interface InputRow {
  id: number;
  vmName: string;
  ipAddress: string;
  subnetMask: string;
  defaultGateway: string;
}
```

### InputGroup
Represents a group of input rows.

```typescript
export interface InputGroup {
  groupName: string;
  rows: InputRow[];
}
```

### Shard
Represents a subset of the data, divided into manageable chunks.

```typescript
export interface Shard {
  shardId: number;
  groups: InputGroup[];
}
```

### ShardedInputGroups
Represents the entire dataset, divided into shards.

```typescript
export interface ShardedInputGroups {
  totalRows: number;
  shardSize: number;
  shards: Shard[];
}
```

## Data Storage Service
A service to manage data storage and retrieval from IndexedDB using the `idb` library.

### Installation
Install the `idb` package:
```bash
npm install idb
```

### Implementation

```typescript name=src/app/services/data-storage.service.ts
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
```

## Angular Component

### Component Logic
The component handles dynamic rows per page and pagination.

```typescript name=src/app/components/grouped-input/grouped-input.component.ts
import { Component, OnInit } from '@angular/core';
import { DataStorageService } from '../../services/data-storage.service';
import { Shard, ShardedInputGroups } from '../../models/sharded-input.model';

@Component({
  selector: 'app-grouped-input',
  templateUrl: './grouped-input.component.html',
  styleUrls: ['./grouped-input.component.css']
})
export class GroupedInputComponent implements OnInit {
  shardedInputGroups: ShardedInputGroups = { totalRows: 0, shardSize: 1000, shards: [] };
  currentPage: number = 1;
  rowsPerPage: number = 10; // Default value for rows per page
  currentShard: Shard | undefined;

  constructor(private dataStorageService: DataStorageService) {}

  ngOnInit(): void {
    this.initialize();
  }

  async initialize(): Promise<void> {
    await this.loadShard(0); // Load the first shard initially
  }

  async loadShard(shardId: number): Promise<void> {
    this.currentShard = await this.dataStorageService.getShard(shardId);
  }

  async nextPage(): Promise<void> {
    const nextPageShardId = Math.floor((this.currentPage * this.rowsPerPage) / this.shardedInputGroups.shardSize);
    if (nextPageShardId !== this.currentShard?.shardId) {
      await this.loadShard(nextPageShardId);
    }
    this.currentPage++;
  }

  async prevPage(): Promise<void> {
    if (this.currentPage > 1) {
      this.currentPage--;
      const prevPageShardId = Math.floor(((this.currentPage - 1) * this.rowsPerPage) / this.shardedInputGroups.shardSize);
      if (prevPageShardId !== this.currentShard?.shardId) {
        await this.loadShard(prevPageShardId);
      }
    }
  }

  async setRowsPerPage(rows: number): Promise<void> {
    this.rowsPerPage = rows;
    this.currentPage = 1; // Reset to the first page
    await this.loadShard(0); // Load the first shard initially
  }
}
```

### Component Template
The template displays the grouped inputs and pagination controls.

```html name=src/app/components/grouped-input/grouped-input.component.html
<div *ngIf="currentShard">
  <div *ngFor="let group of currentShard.groups">
    <h3>{{ group.groupName }}</h3>
    <table>
      <thead>
        <tr>
          <th>VM Name</th>
          <th>IP Address</th>
          <th>Subnet Mask</th>
          <th>Default Gateway</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let row of group.rows.slice(0, rowsPerPage)">
          <td>{{ row.vmName }}</td>
          <td><input [value]="row.ipAddress" /></td>
          <td><input [value]="row.subnetMask" /></td>
          <td><input [value]="row.defaultGateway" /></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div>
    <button (click)="prevPage()" [disabled]="currentPage === 1">Previous</button>
    <button (click)="nextPage()" [disabled]="currentPage * rowsPerPage >= shardedInputGroups.totalRows">Next</button>
  </div>
  <div>
    <label for="rowsPerPage">Rows per page:</label>
    <select id="rowsPerPage" (change)="setRowsPerPage($event.target.value)">
      <option *ngFor="let n of [10, 15, 20]" [value]="n">{{ n }}</option>
    </select>
  </div>
</div>
```

### Component Styles
Add your component styles here.

```css name=src/app/components/grouped-input/grouped-input.component.css
table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
}

th {
  background-color: #f2f2f2;
  text-align: left;
}
```

## Summary
This document outlines the steps to design an Angular component with grouped inputs and pagination, and store the data in IndexedDB using a sharded approach. The implementation ensures efficient data management and retrieval, even for large datasets.

For further enhancements, consider adding features like search, filtering, and improved UI/UX as needed.