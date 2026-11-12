import { posDeviceRepository } from '../../infrastructure/persistence/pos-device.repository';

export class RegisterPosDeviceUseCase {
  execute(businessId: string, deviceKey: string, label?: string | null) {
    return posDeviceRepository.registerDevice(businessId, deviceKey, label);
  }
}
