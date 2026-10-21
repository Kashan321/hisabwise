export type FloorElementType = 'DOOR' | 'WINDOW' | 'RECEPTION_COUNTER' | 'WALL';

export interface FloorPlanEntity {
  id: string;
  businessId: string;
  name: string;
  level: number;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: Date;
  tableCount?: number;
}

export interface FloorElementEntity {
  id: string;
  floorPlanId: string;
  type: FloorElementType;
  layoutX: number;
  layoutY: number;
  width: number;
  height: number;
  rotation: number;
  options: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateFloorPlanInput {
  name: string;
  level?: number;
  width: number;
  height: number;
}

export interface UpdateFloorPlanInput {
  name?: string;
  level?: number;
  width?: number;
  height?: number;
  sortOrder?: number;
}

export interface CreateFloorElementInput {
  type: FloorElementType;
  layoutX: number;
  layoutY: number;
  width: number;
  height: number;
  rotation?: number;
  options?: Record<string, unknown>;
}

export interface UpdateFloorElementInput {
  layoutX?: number;
  layoutY?: number;
  width?: number;
  height?: number;
  rotation?: number;
  options?: Record<string, unknown>;
}
