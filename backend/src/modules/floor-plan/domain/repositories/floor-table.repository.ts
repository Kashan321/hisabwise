import {
  CreateTableInput,
  FloorTableEntity,
  TableStatus,
  UpdateTableInput,
} from '../entities/floor-table.entity';

export interface FloorTableRepository {
  findAll(businessId: string, floorPlanId?: string): Promise<FloorTableEntity[]>;
  findById(businessId: string, tableId: string): Promise<FloorTableEntity | null>;
  create(businessId: string, input: CreateTableInput, floorPlanId: string): Promise<FloorTableEntity>;
  update(businessId: string, tableId: string, input: UpdateTableInput): Promise<FloorTableEntity>;
  updateStatus(businessId: string, tableId: string, status: TableStatus): Promise<FloorTableEntity>;
  delete(businessId: string, tableId: string): Promise<void>;
}
