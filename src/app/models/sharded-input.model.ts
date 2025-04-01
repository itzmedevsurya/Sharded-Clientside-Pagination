export interface InputRow {
  id: number;
  vmName: string;
  ipAddress: string;
  subnetMask: string;
  defaultGateway: string;
}

export interface InputGroup {
  groupName: string;
  rows: InputRow[];
}

export interface Shard {
  shardId: number;
  groups: InputGroup[];
}

export interface ShardedInputGroups {
  totalRows: number;
  shardSize: number;
  shards: Shard[];
}