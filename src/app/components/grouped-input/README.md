# Grouped Input Component

The `GroupedInputComponent` displays rows of inputs grouped by a group name with pagination. It integrates with IndexedDB for efficient data storage and retrieval, and utilizes Web Workers to handle data processing tasks in the background.

## Features

- Grouped input rows with group names
- Pagination based on the number of rows
- Efficient data storage using IndexedDB
- Dynamic adjustment of rows per page
- Enhanced performance using Web Workers

## Inputs

- `inputData`: An object of type `ShardedInputGroups` representing the sharded input data.

## Usage

```typescript
import { Component } from '@angular/core';
import { ShardedInputGroups } from '../../models/sharded-input.model';

@Component({
  selector: 'app-root',
  template: `<app-grouped-input [inputData]="shardedData"></app-grouped-input>`
})
export class AppComponent {
  shardedData: ShardedInputGroups = {
    totalRows: 70000,
    shardSize: 1000,
    shards: []
  };

  constructor() {
    // Initialize shardedData with actual data
  }
}
```

## Web Workers Integration

This component uses a Web Worker to process data in the background, ensuring the UI remains responsive.

### Web Worker Implementation

The Web Worker is defined in `src/app/workers/data-worker.worker.ts` and handles tasks like sharding data and retrieving specific shards.

```typescript
/// <reference lib="webworker" />

import { Shard, InputGroup, InputRow } from '../../models/sharded-input.model';

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
```

### Using the Web Worker in the Component

The `GroupedInputComponent` uses the Web Worker to handle data processing tasks.

```typescript
import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Shard, ShardedInputGroups } from '../../models/sharded-input.model';

@Component({
  selector: 'app-grouped-input',
  templateUrl: './grouped-input.component.html',
  styleUrls: ['./grouped-input.component.css']
})
export class GroupedInputComponent implements OnInit, OnChanges {
  @Input() inputData: ShardedInputGroups;
  shardedInputGroups: ShardedInputGroups;
  currentPage: number = 1;
  rowsPerPage: number = 10; // Default value for rows per page
  currentShard: Shard | undefined;
  private worker: Worker;

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/data-worker.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (data.shardId !== undefined) {
          this.currentShard = data;
        } else if (Array.isArray(data)) {
          this.shardedInputGroups.shards = data;
        }
      };
    } else {
      console.error('Web Workers are not supported in this environment.');
    }
  }

  ngOnInit(): void {
    if (this.inputData) {
      this.initialize();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.inputData && changes.inputData.currentValue) {
      this.initialize();
    }
  }

  async initialize(): Promise<void> {
    this.shardedInputGroups = this.inputData;
    this.postMessageToWorker('shardData', { groups: this.inputData.shards.flatMap(shard => shard.groups), shardSize: this.shardedInputGroups.shardSize });
    await this.loadShard(0); // Load the first shard initially
  }

  async loadShard(shardId: number): Promise<void> {
    this.postMessageToWorker('getShard', { shardId, shardSize: this.shardedInputGroups.shardSize, groups: this.inputData.shards.flatMap(shard => shard.groups) });
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

  private postMessageToWorker(action: string, payload: any) {
    if (this.worker) {
      this.worker.postMessage({ action, payload });
    }
  }
}
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.