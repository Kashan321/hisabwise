import { FloorPlanRepository } from '../../domain/repositories/floor-plan.repository';
import {
  CreateFloorElementInput,
  UpdateFloorElementInput,
} from '../../domain/entities/floor-plan.entity';

export class CreateElementUseCase {
  constructor(private readonly planRepository: FloorPlanRepository) {}

  execute(businessId: string, planId: string, input: CreateFloorElementInput) {
    return this.planRepository.createElement(businessId, planId, input);
  }
}

export class UpdateElementUseCase {
  constructor(private readonly planRepository: FloorPlanRepository) {}

  execute(businessId: string, elementId: string, input: UpdateFloorElementInput) {
    return this.planRepository.updateElement(businessId, elementId, input);
  }
}

export class DeleteElementUseCase {
  constructor(private readonly planRepository: FloorPlanRepository) {}

  execute(businessId: string, elementId: string) {
    return this.planRepository.deleteElement(businessId, elementId);
  }
}
