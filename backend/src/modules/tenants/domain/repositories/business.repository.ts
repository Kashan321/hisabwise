import { BusinessEntity, UpdateBusinessInput } from '../entities/business.entity';

export interface BusinessRepository {
  findById(id: string): Promise<BusinessEntity | null>;
  update(id: string, input: UpdateBusinessInput): Promise<BusinessEntity>;
}
