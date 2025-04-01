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

export interface PaginatedInputGroups {
  currentPage: number;
  pageSize: number;
  totalRows: number;
  groups: InputGroup[];
}