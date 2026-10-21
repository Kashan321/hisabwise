import { MenuRepository } from '../../domain/repositories/menu.repository';

export class GetFullMenuUseCase {
  constructor(private readonly menuRepository: MenuRepository) {}

  execute(businessId: string) {
    return this.menuRepository.getFullMenu(businessId);
  }
}
