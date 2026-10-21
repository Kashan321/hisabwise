export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'NEEDS_CLEANING';
export type TableShape = 'ROUND' | 'SQUARE' | 'RECTANGLE' | 'BOOTH';

export interface FloorTableEntity {
  id: string;
  businessId: string;
  floorPlanId: string;
  tableIdentifier: string;
  layoutX: number;
  layoutY: number;
  width: number;
  height: number;
  capacity: number;
  shape: TableShape;
  rotation: number;
  status: TableStatus;
  createdAt: Date;
}

export interface CreateTableInput {
  floorPlanId?: string;
  tableIdentifier: string;
  layoutX: number;
  layoutY: number;
  width?: number;
  height?: number;
  capacity?: number;
  shape?: TableShape;
  rotation?: number;
}

export interface UpdateTableInput {
  tableIdentifier?: string;
  layoutX?: number;
  layoutY?: number;
  width?: number;
  height?: number;
  capacity?: number;
  shape?: TableShape;
  rotation?: number;
}
