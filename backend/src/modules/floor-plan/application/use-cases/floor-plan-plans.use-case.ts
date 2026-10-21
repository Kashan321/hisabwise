import { FloorPlanRepository } from '../../domain/repositories/floor-plan.repository';
import { FloorPlanNotFoundError } from '../../domain/errors/floor-plan.errors';
import { CreateFloorPlanInput } from '../../domain/entities/floor-plan.entity';

export class CreatePlanUseCase {
  constructor(private readonly planRepository: FloorPlanRepository) {}

  execute(businessId: string, input: CreateFloorPlanInput) {
    return this.planRepository.createPlan(businessId, input);
  }
}

export class GetFloorSceneUseCase {
  constructor(private readonly planRepository: FloorPlanRepository) {}

  async execute(businessId: string, planId: string) {
    const scene = await this.planRepository.getScene(businessId, planId);
    if (!scene) throw new FloorPlanNotFoundError();
    return scene;
  }
}

export class UpdatePlanUseCase {
  constructor(private readonly planRepository: FloorPlanRepository) {}

  execute(businessId: string, planId: string, input: Parameters<FloorPlanRepository['updatePlan']>[2]) {
    return this.planRepository.updatePlan(businessId, planId, input);
  }
}

export class DeletePlanUseCase {
  constructor(private readonly planRepository: FloorPlanRepository) {}

  async execute(businessId: string, planId: string) {
    const plans = await this.planRepository.findAllPlans(businessId);
    if (plans.length <= 1) {
      throw new FloorPlanNotFoundError();
    }
    await this.planRepository.deletePlan(businessId, planId);
  }
}
