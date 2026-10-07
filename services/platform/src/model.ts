import { z } from 'zod';
import { sourceKinds, validateParameters, connectorDefinitions } from './registry';
export const httpsUrl = z
  .string()
  .url()
  .refine((v) => new URL(v).protocol === 'https:', 'HTTPS URL required');
export const kinds = sourceKinds;
export const SourceSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,60}$/),
    kind: z.enum(kinds),
    enabled: z.boolean().default(true),
    label: z.string().min(1),
    url: httpsUrl.optional(),
    secretRef: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]+$/)
      .optional(),
    intervalSeconds: z.number().int().min(60).default(300),
    attribution: z.string().min(1),
    termsUrl: httpsUrl,
    region: z.string().default(''),
    categories: z.array(z.string()).default([]),
    params: z.record(z.string()).default({}),
    staticSourceId: z.string().optional(),
    operations: z
      .array(z.enum(['quote', 'reserve', 'lookup', 'cancel', 'fulfill', 'calendar-write']))
      .default([]),
    manual: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          category: z.enum(['event', 'experience', 'facility', 'accommodation', 'parking', 'ride']),
          description: z.string().default(''),
          url: httpsUrl.optional(),
          lat: z.number().min(-90).max(90).optional(),
          lon: z.number().min(-180).max(180).optional(),
          receptionStart: z.string().datetime({ offset: true }).optional(),
          start: z.string().datetime({ offset: true }).optional(),
          end: z.string().datetime({ offset: true }).optional(),
          status: z.enum(['scheduled', 'cancelled']).default('scheduled'),
          online: z.boolean().default(false),
        }),
      )
      .default([]),
  })
  .strict()
  .superRefine((s, c) => {
    const result = (() => {
      try {
        validateParameters(s.kind, s.params);
        return undefined;
      } catch (e) {
        return e as z.ZodError;
      }
    })();
    for (const issue of result?.issues || [])
      c.addIssue({ ...issue, path: ['params', ...issue.path] });
    if (s.operations.some((op) => !connectorDefinitions[s.kind].capabilities.includes(op)))
      c.addIssue({
        code: 'custom',
        message: 'Operation is not implemented by this connector',
        path: ['operations'],
      });
    if (
      s.operations.includes('reserve') &&
      ['viator', 'booking', 'expedia'].includes(s.kind) &&
      (!s.params.paymentMode || ['disabled', 'external'].includes(s.params.paymentMode))
    )
      c.addIssue({
        code: 'custom',
        message: 'Choose a supported provider payment mode before enabling reservations',
        path: ['params', 'paymentMode'],
      });
    if (s.kind === 'gtfs-rt' && !s.staticSourceId)
      c.addIssue({ code: 'custom', message: 'GTFS-RT requires staticSourceId' });
    if (['gtfs', 'gtfs-rt', 'gbfs'].includes(s.kind) && !s.url)
      c.addIssue({ code: 'custom', message: 'Feed URL required' });
  });
export const ProductSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.literal('JPY'),
    validHours: z.number().int().min(1).max(720),
    enabled: z.boolean(),
    terms: z.string().min(1),
    seller: z.string().min(1),
    contact: z.string().min(1),
  })
  .strict();
export const ConfigSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]),
    name: z.string().min(1),
    region: z.string(),
    language: z.enum(['ja', 'en']).default('ja'),
    timezone: z
      .string()
      .default('Asia/Tokyo')
      .refine((v) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, 'Invalid timezone'),
    contact: z.string(),
    features: z.object({
      activities: z.boolean(),
      transit: z.boolean(),
      accommodations: z.boolean(),
      commerce: z.boolean(),
    }),
    sources: z.array(SourceSchema),
    products: z.array(ProductSchema).default([]),
    journey: z
      .object({
        provider: z.enum(['none', 'otp', 'ekispert']),
        url: httpsUrl.optional(),
        secretRef: z.string().optional(),
        routerId: z.string().default('default'),
      })
      .default({ provider: 'none', routerId: 'default' }),
    oidc: z
      .object({
        issuer: httpsUrl,
        clientId: z.string().min(1),
        clientSecretRef: z.string().optional(),
      })
      .optional(),
    admins: z.array(z.string()).default([]),
    validators: z.array(z.string()).default([]),
  })
  .strict()
  .superRefine((v, c) => {
    if (new Set(v.sources.map((s) => s.id)).size !== v.sources.length)
      c.addIssue({ code: 'custom', message: 'Duplicate source IDs' });
    if (new Set(v.products.map((p) => p.id)).size !== v.products.length)
      c.addIssue({ code: 'custom', message: 'Duplicate product IDs' });
    for (const s of v.sources)
      if (
        s.staticSourceId &&
        !v.sources.some((x) => x.id === s.staticSourceId && x.kind === 'gtfs')
      )
        c.addIssue({ code: 'custom', message: 'Unknown static GTFS source' });
    if (v.journey.provider === 'ekispert' && !v.journey.secretRef)
      c.addIssue({ code: 'custom', message: 'Ekispert secretRef required' });
    if (v.journey.provider === 'otp' && !v.journey.url)
      c.addIssue({ code: 'custom', message: 'OTP URL required' });
  })
  .transform((v) => ({ ...v, version: 2 as const }));
export type Config = z.infer<typeof ConfigSchema>;
export type Source = z.infer<typeof SourceSchema>;
export interface Place {
  name: string;
  lat?: number;
  lon?: number;
  address?: string;
}
export interface Action {
  type: 'external';
  label: string;
  url: string;
}
export interface Activity {
  id: string;
  sourceId: string;
  externalId: string;
  title: string;
  description: string;
  category: string;
  region: string;
  place: Place;
  receptionStart?: string;
  start?: string;
  end?: string;
  online: boolean;
  status: 'scheduled' | 'cancelled';
  actions: Action[];
  fetchedAt: string;
  bookingWindow?: { checkinDate: string; checkoutDate: string; adults: number };
  price?: { amount: number; currency: string; conditions: string };
}
export interface RecordItem {
  kind: string;
  id: string;
  body: unknown;
}
export interface PlanItem {
  type: 'activity' | 'outbound' | 'return' | 'accommodation' | 'ticket' | 'ride' | 'parking';
  referenceId?: string;
  title: string;
  status: 'saved' | 'external';
  start?: string;
  end?: string;
  url?: string;
  snapshot?: Activity;
  data?: unknown;
}
export const PlanSchema = z.object({
  title: z.string().min(1).max(200),
  items: z
    .array(
      z.object({
        type: z.enum([
          'activity',
          'outbound',
          'return',
          'accommodation',
          'ticket',
          'ride',
          'parking',
        ]),
        referenceId: z.string().optional(),
        title: z.string().min(1),
        status: z.enum(['saved', 'external']).default('saved'),
        start: z.string().datetime({ offset: true }).optional(),
        end: z.string().datetime({ offset: true }).optional(),
        url: httpsUrl.optional(),
        snapshot: z.unknown().optional(),
        data: z.unknown().optional(),
      }),
    )
    .max(100),
});
export interface Env {
  DB: D1Database;
  SEARCH_LIMITER?: RateLimit;
  FEEDS: R2Bucket;
  APP_ORIGIN: string;
  API_ORIGIN: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  BOOTSTRAP_TOKEN?: string;
  [key: string]: unknown;
}
export const defaultConfig: Config = ConfigSchema.parse({
  version: 1,
  name: 'OpenMaaS',
  region: '',
  contact: '',
  features: { activities: true, transit: true, accommodations: true, commerce: false },
  sources: [],
});
export function secret(env: Env, ref?: string): string {
  const v = ref ? env[ref] : undefined;
  if (typeof v !== 'string' || !v) throw new Error('Required credential is not configured');
  return v;
}
export function safeLink(v: unknown): string | undefined {
  if (typeof v !== 'string') return;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !u.username && !u.password ? u.toString() : undefined;
  } catch {
    return;
  }
}
export function activity(
  s: Source,
  externalId: string,
  title: string,
  place: Place,
  extra: Partial<Activity> = {},
): Activity {
  return {
    id: `${s.id}:${externalId}`,
    sourceId: s.id,
    externalId,
    title,
    description: '',
    category: 'event',
    region: s.region,
    place,
    online: false,
    status: 'scheduled',
    actions: [],
    fetchedAt: new Date().toISOString(),
    ...extra,
  };
}
export function deduplicate(items: Activity[]): Activity[] {
  const seen = new Set<string>();
  return items.filter((a) => {
    const u = a.actions[0]?.url;
    const key = u
      ? `${u}|${a.start || ''}|${a.bookingWindow ? JSON.stringify(a.bookingWindow) : ''}`
      : a.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
