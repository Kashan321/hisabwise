import { z } from 'zod';

const tableStatusEnum = z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'NEEDS_CLEANING']);
const tableShapeEnum = z.enum(['ROUND', 'SQUARE', 'RECTANGLE', 'BOOTH']);
const floorElementTypeEnum = z.enum(['DOOR', 'WINDOW', 'RECEPTION_COUNTER', 'WALL']);

export const createTableSchema = z.object({
  floorPlanId: z.string().uuid().optional(),
  tableIdentifier: z.string().trim().min(1).max(50),
  layoutX: z.number(),
  layoutY: z.number(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  shape: tableShapeEnum.optional(),
  rotation: z.number().optional(),
});

export const updateTableSchema = z.object({
  tableIdentifier: z.string().trim().min(1).max(50).optional(),
  layoutX: z.number().optional(),
  layoutY: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  shape: tableShapeEnum.optional(),
  rotation: z.number().optional(),
});

export const updateTableStatusSchema = z.object({
  status: tableStatusEnum,
});

export const createFloorPlanSchema = z.object({
  name: z.string().trim().min(1).max(80),
  level: z.number().int().min(1).max(100).optional(),
  width: z.number().positive().max(5000),
  height: z.number().positive().max(5000),
});

export const updateFloorPlanSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  level: z.number().int().min(1).max(100).optional(),
  width: z.number().positive().max(5000).optional(),
  height: z.number().positive().max(5000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createFloorElementSchema = z.object({
  type: floorElementTypeEnum,
  layoutX: z.number(),
  layoutY: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export const updateFloorElementSchema = z.object({
  layoutX: z.number().optional(),
  layoutY: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  rotation: z.number().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
