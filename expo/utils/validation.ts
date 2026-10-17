import { z } from 'zod';

const nonnegative = z.number().finite().nonnegative();
export const routePointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  timestamp: nonnegative,
  speed: z.number().finite(),
  accuracy: nonnegative,
});
export const draftSchema = z
  .object({
    startTime: nonnegative,
    endTime: nonnegative,
    distance: nonnegative,
    duration: nonnegative,
    routePoints: z.array(routePointSchema),
  })
  .refine((trip) => trip.endTime >= trip.startTime, 'Invalid trip time range');
export const tripSchema = z
  .object({
    id: z.string().min(1),
    startTime: nonnegative,
    endTime: nonnegative,
    distance: nonnegative,
    duration: nonnegative,
    purpose: z.enum(['business', 'personal', 'medical', 'charity']),
    projectId: z.string().nullable(),
    vehicleId: z.string().nullable(),
    notes: z.string().default(''),
    routePoints: z.array(routePointSchema).default([]),
  })
  .refine((trip) => trip.endTime >= trip.startTime, 'Invalid trip time range');
export const namedItemSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });
export const settingsSchema = z.object({
  rounding: z.enum(['0.1', '0.01']).default('0.1'),
  lockTripsAfter24h: z.boolean().default(false),
  allowEdits: z.boolean().default(true),
  autoDetectDriving: z.boolean().default(false),
  distanceUnit: z.enum(['miles', 'km']).default('miles'),
});
export function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
