import { FloorPlanRepository } from '../../domain/repositories/floor-plan.repository';

export class ListPlansUseCase {
  constructor(private readonly planRepository: FloorPlanRepository) {}

  async execute(businessId: string) {
    const plans = await this.planRepository.findAllPlans(businessId);
    if (plans.length === 0) {
      const defaultPlan = await this.planRepository.ensureDefaultPlan(businessId);
      return [defaultPlan];
    }
    return plans;
  }
}
