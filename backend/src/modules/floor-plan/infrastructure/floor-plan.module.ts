import { CreateTableUseCase } from '../application/use-cases/create-table.use-case';
import { ListTablesUseCase } from '../application/use-cases/list-tables.use-case';
import { UpdateTableUseCase } from '../application/use-cases/update-table.use-case';
import { FreeTableUseCase } from '../application/use-cases/free-table.use-case';
import { UpdateTableStatusUseCase } from '../application/use-cases/update-table-status.use-case';
import { DeleteTableUseCase } from '../application/use-cases/delete-table.use-case';
import { ListPlansUseCase } from '../application/use-cases/list-plans.use-case';
import {
  CreatePlanUseCase,
  DeletePlanUseCase,
  GetFloorSceneUseCase,
  UpdatePlanUseCase,
} from '../application/use-cases/floor-plan-plans.use-case';
import {
  CreateElementUseCase,
  DeleteElementUseCase,
  UpdateElementUseCase,
} from '../application/use-cases/floor-plan-elements.use-case';
import { PrismaFloorTableRepository } from './persistence/prisma-floor-table.repository';
import { PrismaFloorPlanRepository } from './persistence/prisma-floor-plan.repository';

const tableRepository = new PrismaFloorTableRepository();
const planRepository = new PrismaFloorPlanRepository();

export const floorPlanModule = {
  listPlans: new ListPlansUseCase(planRepository),
  getFloorScene: new GetFloorSceneUseCase(planRepository),
  createPlan: new CreatePlanUseCase(planRepository),
  updatePlan: new UpdatePlanUseCase(planRepository),
  deletePlan: new DeletePlanUseCase(planRepository),
  createElement: new CreateElementUseCase(planRepository),
  updateElement: new UpdateElementUseCase(planRepository),
  deleteElement: new DeleteElementUseCase(planRepository),
  listTables: new ListTablesUseCase(tableRepository),
  createTable: new CreateTableUseCase(tableRepository, planRepository),
  updateTable: new UpdateTableUseCase(tableRepository),
  updateTableStatus: new UpdateTableStatusUseCase(tableRepository),
  freeTable: new FreeTableUseCase(tableRepository),
  deleteTable: new DeleteTableUseCase(tableRepository),
};
