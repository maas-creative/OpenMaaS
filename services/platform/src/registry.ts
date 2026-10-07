import { z } from 'zod';
const text = z.string().max(1000).optional();
const iso = z.string().datetime({ offset: true }).optional();
const id = z
  .string()
  .regex(/^[\w.:-]+$/)
  .optional();
export const parameterSchemas = {
  manual: z.object({}).strict(),
  luma: z
    .object({
      scope: z.enum(['calendar', 'organization']).optional(),
      calendarIds: text,
      after: iso,
      before: iso,
    })
    .strict(),
  connpass: z
    .object({
      keyword: text,
      keyword_or: text,
      event_id: text,
      ym: text,
      ymd: text,
      nickname: text,
      owner_nickname: text,
      series_id: text,
      order: z.enum(['1', '2', '3']).optional(),
    })
    .strict(),
  rakuten: z
    .object({
      applicationId: text,
      affiliateId: text,
      hotelNo: text,
      largeClassCode: text,
      middleClassCode: text,
      smallClassCode: text,
      detailClassCode: text,
      latitude: text,
      longitude: text,
      searchRadius: text,
      checkinDate: text,
      checkoutDate: text,
      adultNum: text,
    })
    .strict(),
  gtfs: z.object({ ingestion: z.enum(['worker', 'cli']).optional() }).strict(),
  'gtfs-rt': z.object({}).strict(),
  gbfs: z.object({ language: text }).strict(),
  odpt: z
    .object({
      'odpt:operator': text,
      'odpt:railway': text,
      datasets: z
        .string()
        .regex(
          /^(Station|StationTimetable|TrainTimetable|TrainInformation)(,(Station|StationTimetable|TrainTimetable|TrainInformation))*$/,
        )
        .optional(),
    })
    .strict(),
  eventbrite: z
    .object({
      organizationId: id,
      status: z.enum(['live', 'started', 'ended', 'completed', 'all']).optional(),
    })
    .strict(),
  ticketmaster: z
    .object({
      countryCode: text,
      city: text,
      keyword: text,
      startDateTime: iso,
      endDateTime: iso,
      classificationName: text,
      locale: text,
    })
    .strict(),
  tomtom: z
    .object({ parkingIds: text, lat: text, lon: text, radius: text, countrySet: text })
    .strict(),
  square: z
    .object({
      locationId: id,
      environment: z.enum(['sandbox', 'production']).optional(),
      apiVersion: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .strict(),
  viator: z
    .object({
      productCodes: text,
      currency: text,
      language: text,
      environment: z.enum(['sandbox', 'production']).optional(),
      paymentMode: z.enum(['external', 'iframe']).optional(),
    })
    .strict(),
  booking: z
    .object({
      affiliateId: text,
      country: text,
      city: text,
      bookerCountry: text,
      platform: z.enum(['desktop', 'mobile']).optional(),
      environment: z.enum(['sandbox', 'production']).optional(),
      accommodationIds: text,
      paymentMode: z.enum(['external', 'card', 'wallet']).optional(),
    })
    .strict(),
  expedia: z
    .object({
      propertyIds: text,
      countryCode: text,
      currency: text,
      language: text,
      salesChannel: z.enum(['website', 'agent_tool', 'mobile_app']).optional(),
      salesEnvironment: z.enum(['hotel_only', 'hotel_package', 'loyalty']).optional(),
      environment: z.enum(['sandbox', 'production']).optional(),
      paymentMode: z.enum(['disabled', 'card']).optional(),
    })
    .strict(),
  uber: z
    .object({
      environment: z.enum(['sandbox', 'production']).optional(),
      organizationId: text,
      sandboxRunId: text,
      clientId: text,
      clientSecretRef: text,
    })
    .strict(),
  masabi: z.object({}).strict(),
  'google-calendar': z.object({ clientId: text }).strict(),
};
export const sourceKinds = Object.keys(parameterSchemas) as [
  keyof typeof parameterSchemas,
  ...(keyof typeof parameterSchemas)[],
];
export type ConnectorKind = keyof typeof parameterSchemas;
export const connectorDefinitions = Object.fromEntries(
  sourceKinds.map((kind) => [
    kind,
    {
      kind,
      label: kind,
      implemented: kind !== 'masabi',
      capabilities: (
        {
          manual: ['read', 'external'],
          luma: ['read', 'search', 'external'],
          connpass: ['read', 'search', 'external'],
          rakuten: ['read', 'availability', 'external'],
          gtfs: ['read'],
          'gtfs-rt': ['read'],
          gbfs: ['read', 'external'],
          odpt: ['read'],
          eventbrite: ['read', 'external', 'lookup-orders'],
          ticketmaster: ['read', 'search', 'external'],
          tomtom: ['read', 'availability'],
          square: ['read', 'availability', 'quote', 'reserve', 'lookup', 'cancel'],
          viator: [
            'read',
            'availability',
            'external',
            'quote',
            'reserve',
            'lookup',
            'cancel',
            'fulfill',
          ],
          booking: ['read', 'availability', 'external', 'quote', 'reserve', 'lookup', 'cancel'],
          expedia: ['read', 'availability', 'quote', 'reserve', 'lookup', 'cancel'],
          uber: ['quote', 'reserve', 'lookup', 'cancel'],
          masabi: [],
          'google-calendar': ['calendar-write'],
        } as Record<string, string[]>
      )[kind],
      credentialRequired: !['manual', 'gtfs', 'gtfs-rt', 'gbfs', 'masabi'].includes(kind),
      required:
        (
          {
            rakuten: ['applicationId'],
            eventbrite: ['organizationId'],
            square: ['locationId'],
            viator: ['productCodes'],
            booking: ['affiliateId', 'bookerCountry', 'accommodationIds'],
            expedia: [
              'propertyIds',
              'countryCode',
              'currency',
              'language',
              'salesChannel',
              'salesEnvironment',
            ],
            'google-calendar': ['clientId'],
          } as Record<string, string[]>
        )[kind] || [],
      fields: Object.entries(parameterSchemas[kind].shape).map(([name, schema]) => ({
        name,
        type: 'text',
        options:
          schema instanceof z.ZodOptional && schema.unwrap() instanceof z.ZodEnum
            ? (schema.unwrap() as z.ZodEnum<[string, ...string[]]>).options
            : undefined,
      })),
      status: kind === 'masabi' ? 'specification-required' : 'implemented',
    },
  ]),
) as Record<
  ConnectorKind,
  {
    kind: string;
    label: string;
    implemented: boolean;
    capabilities: string[];
    credentialRequired: boolean;
    required: string[];
    fields: { name: string; type: string; options?: string[] }[];
    status: string;
  }
>;
export function validateParameters(kind: ConnectorKind, params: Record<string, string>) {
  return parameterSchemas[kind].parse(params);
}
