import { z } from 'zod';

// HTTPS only image URL validation per security rules (section 5)
export const httpsUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => !val || (val.startsWith('https://') && z.string().url().safeParse(val).success),
    { message: 'Image URL must be a valid secure HTTPS link' }
  )
  .nullable()
  .optional();

export const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be 120 characters or fewer'),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. massage-60min)'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer').nullable().optional(),
  duration_minutes: z.coerce
    .number()
    .int()
    .min(5, 'Duration must be at least 5 minutes')
    .max(1440, 'Duration cannot exceed 1440 minutes (24 hours)'),
  price_major: z
    .string()
    .trim()
    .min(1, 'Price is required')
    .refine((val) => !isNaN(Number(val.replace(/,/g, ''))) && Number(val.replace(/,/g, '')) >= 0, {
      message: 'Price must be a non-negative number',
    }),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter uppercase code (e.g. NGN)'),
  image_url: httpsUrlSchema,
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export const resourceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name must be 120 characters or fewer'),
  kind: z.enum(['staff', 'room', 'equipment', 'other']),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer').nullable().optional(),
  image_url: httpsUrlSchema,
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export const createBookingSchema = z.object({
  service_id: z.string().uuid('Please select a service'),
  resource_id: z.string().uuid('Please select a resource'),
  slot_starts_at: z.string().min(1, 'Please select a time slot'),
  contact_name: z
    .string()
    .trim()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name cannot exceed 100 characters'),
  contact_email: z
    .string()
    .trim()
    .min(1, 'Contact email is required')
    .email('Invalid email address')
    .max(254, 'Email cannot exceed 254 characters'),
  contact_phone: z
    .string()
    .trim()
    .max(30, 'Phone cannot exceed 30 characters')
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Customer notes cannot exceed 1000 characters')
    .nullable()
    .optional(),
  override_price_major: z.string().trim().optional(),
});

export const updateBookingContactSchema = z.object({
  contact_name: z
    .string()
    .trim()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name cannot exceed 100 characters'),
  contact_email: z
    .string()
    .trim()
    .min(1, 'Contact email is required')
    .email('Invalid email address')
    .max(254, 'Email cannot exceed 254 characters'),
  contact_phone: z
    .string()
    .trim()
    .max(30, 'Phone cannot exceed 30 characters')
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Customer notes cannot exceed 1000 characters')
    .nullable()
    .optional(),
});

export const cancelBookingSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'Cancellation reason cannot exceed 500 characters')
    .nullable()
    .optional(),
});

export const rescheduleBookingSchema = z.object({
  resource_id: z.string().uuid(),
  starts_at: z.string().min(1, 'Please pick a slot'),
});

export const internalNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .max(4000, 'Internal note cannot exceed 4000 characters'),
});

export const recordManualPaymentSchema = z.object({
  amount_major: z
    .string()
    .trim()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val.replace(/,/g, ''))) && Number(val.replace(/,/g, '')) > 0, {
      message: 'Amount must be greater than zero',
    }),
  confirm_booking: z.boolean().default(true),
});

export const businessSettingsSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(120, 'Business name cannot exceed 120 characters'),
  timezone: z.string().trim().min(1, 'Timezone is required'),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter uppercase code'),
  slot_interval_minutes: z.coerce
    .number()
    .refine((val) => [5, 10, 15, 20, 30, 60].includes(val), {
      message: 'Slot interval must be 5, 10, 15, 20, 30, or 60 minutes',
    }),
  min_notice_minutes: z.coerce.number().int().min(0, 'Notice minutes cannot be negative'),
  max_advance_days: z.coerce
    .number()
    .int()
    .min(1, 'Max advance must be at least 1 day')
    .max(730, 'Max advance cannot exceed 730 days (2 years)'),
  cancellation_window_hours: z.coerce.number().int().min(0, 'Cancellation window cannot be negative'),
  hold_minutes: z.coerce
    .number()
    .int()
    .min(1, 'Hold duration must be at least 1 minute')
    .max(120, 'Hold duration cannot exceed 120 minutes'),
  max_pending_per_user: z.coerce
    .number()
    .int()
    .min(1, 'Max pending must be at least 1')
    .max(20, 'Max pending cannot exceed 20'),
});

export const availabilityRuleItemSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format must be HH:mm'),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format must be HH:mm'),
  })
  .refine((val) => val.end_time > val.start_time, {
    message: 'End time must be later than start time',
    path: ['end_time'],
  });

export const timeOffSchema = z
  .object({
    resource_id: z.string().uuid('Please select a resource'),
    starts_at: z.string().min(1, 'Start date and time required'),
    ends_at: z.string().min(1, 'End date and time required'),
    reason: z
      .string()
      .trim()
      .max(300, 'Reason must be 300 characters or fewer')
      .nullable()
      .optional(),
  })
  .refine((val) => new Date(val.ends_at) > new Date(val.starts_at), {
    message: 'End time must be after start time',
    path: ['ends_at'],
  });
