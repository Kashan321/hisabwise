import {
  CreateFloorElementInput,
  CreateFloorPlanInput,
  FloorElementEntity,
  FloorPlanEntity,
  UpdateFloorElementInput,
  UpdateFloorPlanInput,
} from '../entities/floor-plan.entity';
import { FloorTableEntity } from '../entities/floor-table.entity';

export interface FloorPlanScene {
  plan: FloorPlanEntity;
  tables: FloorTableEntity[];
  elements: FloorElementEntity[];
}

export interface FloorPlanRepository {
  findAllPlans(businessId: string): Promise<FloorPlanEntity[]>;
  findPlanById(businessId: string, planId: string): Promise<FloorPlanEntity | null>;
  ensureDefaultPlan(businessId: string): Promise<FloorPlanEntity>;
  createPlan(businessId: string, input: CreateFloorPlanInput): Promise<FloorPlanEntity>;
  updatePlan(
    businessId: string,
    planId: string,
    input: UpdateFloorPlanInput,
  ): Promise<FloorPlanEntity>;
  deletePlan(businessId: string, planId: string): Promise<void>;
  getScene(businessId: string, planId: string): Promise<FloorPlanScene | null>;
  createElement(
    businessId: string,
    planId: string,
    input: CreateFloorElementInput,
  ): Promise<FloorElementEntity>;
  updateElement(
    businessId: string,
    elementId: string,
    input: UpdateFloorElementInput,
  ): Promise<FloorElementEntity>;
  deleteElement(businessId: string, elementId: string): Promise<void>;
}
