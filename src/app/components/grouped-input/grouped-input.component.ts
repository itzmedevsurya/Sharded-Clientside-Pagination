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