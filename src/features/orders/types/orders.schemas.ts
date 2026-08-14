import { z } from "zod";

export const OrderSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  waybill: z.string().nullable().optional(),
  recipientCustomerType: z.enum(["COMPANY", "INDIVIDUAL"]),
  recipientDocument: z.string(),
  recipientName: z.string().nullable().optional(),
  recipientPhone: z.string().nullable().optional(),
  recipientEmail: z.string().nullable().optional(),
  warehouseContact: z.string().nullable().optional(),
  rawAddress: z.string(),
  formattedAddress: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  geocodingStatus: z.string(),
  originBranchId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const RouteAssignmentSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  order: OrderSchema.optional(),
  driverId: z.string().uuid(),
  vehicleId: z.string().nullable().optional(),
  date: z.string().or(z.date()),
  sequenceIndex: z.number(),
  status: z.enum(["PENDING", "IN_TRANSIT", "DELIVERED", "OBSERVED"]),
  reasonText: z.string().nullable().optional(),
  previousAssignmentId: z.string().nullable().optional(),
  originLatitude: z.number().nullable().optional(),
  originLongitude: z.number().nullable().optional(),
  originAddress: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const VehicleSchema = z.object({
  id: z.string().uuid(),
  plate: z.string(),
  model: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const OrderEventSchema = z.object({
  id: z.string().uuid(),
  routeAssignmentId: z.string().uuid(),
  type: z.string(),
  actor: z.string(),
  metadata: z.any().nullable().optional(),
  timestamp: z.string().or(z.date()),
});

export const DriverLocationSchema = z.object({
  driverId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  event: z.string(),
  routeAssignmentId: z.string().uuid().optional(), // Omitido cuando no hay ruta activa (.optional())
  updatedAt: z.string().or(z.date()),
});

export type OrderSchemaType = z.infer<typeof OrderSchema>;
export type RouteAssignmentSchemaType = z.infer<typeof RouteAssignmentSchema>;
export type VehicleSchemaType = z.infer<typeof VehicleSchema>;
export type OrderEventSchemaType = z.infer<typeof OrderEventSchema>;
export type DriverLocationSchemaType = z.infer<typeof DriverLocationSchema>;
