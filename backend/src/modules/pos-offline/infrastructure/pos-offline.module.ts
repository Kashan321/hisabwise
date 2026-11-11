import { RegisterPosDeviceUseCase } from '../application/use-cases/register-pos-device.use-case';
import { GetOfflineSnapshotUseCase } from '../application/use-cases/get-offline-snapshot.use-case';
import { SyncOfflineOrdersBatchUseCase } from '../application/use-cases/sync-offline-orders-batch.use-case';

export const posOfflineModule = {
  registerDevice: new RegisterPosDeviceUseCase(),
  getSnapshot: new GetOfflineSnapshotUseCase(),
  syncBatch: new SyncOfflineOrdersBatchUseCase(),
};
