import { z } from 'zod';

export const createHiveSchema = z.object({
  uid: z.string().min(1, 'uid is required'),
  hive_id: z.string().min(1, 'hive_id is required'),
  lat: z.number({ required_error: 'lat is required' }),
  lng: z.number({ required_error: 'lng is required' }),
  box_count: z.number().int().min(1).optional().default(1),
  queen_status: z.enum(['healthy', 'missing', 'replaced']).optional().default('healthy'),
  health_status: z.enum(['good', 'fair', 'poor']).optional().default('good'),
  notes: z.string().optional().default('')
});

export const updateHiveSchema = z.object({
  hive_id: z.string().optional(),
  box_count: z.number().int().min(1).optional(),
  queen_status: z.enum(['healthy', 'missing', 'replaced']).optional(),
  health_status: z.enum(['good', 'fair', 'poor']).optional(),
  notes: z.string().optional(),
  last_inspection_date: z.string().optional()
}).partial();

export const createInspectionSchema = z.object({
  uid: z.string().min(1),
  hive_id: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().optional().default(''),
  box_count: z.number().int().min(1).optional(),
  queen_status: z.enum(['healthy', 'missing', 'replaced']).optional(),
  health_status: z.enum(['good', 'fair', 'poor']).optional()
});

export const createHarvestSchema = z.object({
  uid: z.string().min(1),
  hive_id: z.string().min(1),
  harvest_date: z.string().min(1),
  flora: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  batch_id: z.string().optional()
});

export const authSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().optional(),
  role: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required')
});
