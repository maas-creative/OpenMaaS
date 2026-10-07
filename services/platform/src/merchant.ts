import { z } from 'zod';
import { decryptTokens } from './tokens';
import { type Source, type Env, safeLink } from './model';
import { viatorRequest, external } from './providers';
import { bookingRequest, expediaRequest, stayQuery } from './inventory';
const text = z.string().min(1).max(500);
const pax = z
  .array(
    z
      .object({
        ageBand: z.enum(['ADULT', 'CHILD', 'INFANT', 'YOUTH', 'SENIOR', 'TRAVELER']),
        numberOfTravelers: z.number().int().min(1).max(20),
      })
      .strict(),
  )
  .min(1)
  .max(6);
export const merchantQueries = {
  viator: z
    .object({
      productCode: text,
      travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      currency: z.enum(['USD', 'CAD', 'GBP', 'AUD', 'EUR']),
      paxMix: pax,
      productOptionCode: text.optional(),
      startTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    })
    .strict(),
  booking: z
    .object({
      accommodationId: z.number().int().positive(),
      productId: text,
      checkin: z.string(),
      checkout: z.string(),
      adults: z.number().int().min(1).max(8),
    })
    .strict(),
  expedia: z
    .object({
      checkin: z.string(),
      checkout: z.string(),
      adults: z.number().int().min(1).max(8),
      propertyId: text,
      roomId: text,
      rateId: text,
    })
    .strict(),
};
// Card details are forwarded in memory only; never persisted in offers, reservations, jobs or logs.
export const cardInput = z
  .object({
    number: z.string().regex(/^\d{12,19}$/),
    cvc: z.string().regex(/^\d{3,4}$/),
    month: z.string().regex(/^(0[1-9]|1[0-2])$/),
    year: z.string().regex(/^20\d{2}$/),
  })
  .strict();
const name = z.object({ first: text, last: text }).strict();
const address = z
  .object({ line: text, city: text, postCode: text, country: z.string().regex(/^[A-Z]{2}$/) })
  .strict();
export const merchantInputs = {
  viator: z
    .object({
      name,
      email: z.string().email(),
      phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
      paymentToken: text,
      answers: z
        .array(
          z
            .object({
              question: text,
              answer: text,
              unit: text.optional(),
              travelerNum: z.number().int().positive().optional(),
            })
            .strict(),
        )
        .default([]),
    })
    .strict(),
  booking: z
    .object({
      name,
      email: z.string().email(),
      phone: text,
      address,
      paymentTiming: z.enum(['pay_online_now', 'pay_online_later', 'pay_at_the_property']),
      card: cardInput.optional(),
    })
    .strict(),
  expedia: z
    .object({
      name,
      email: z.string().email(),
      phone: z
        .object({
          countryCode: z.string().regex(/^\d{1,3}$/),
          number: z.string().regex(/^\d{6,15}$/),
        })
        .strict(),
      address,
      card: cardInput,
    })
    .strict(),
};
const price = (amount: unknown, currency: unknown) => {
  if (!Number.isFinite(Number(amount)) || Number(amount) < 0 || typeof currency !== 'string')
    throw new Error('Provider price unavailable');
  return { amount: Number(amount), currency };
};
export async function merchantQuote(s: Source, env: Env, query: unknown, customerIp: string) {
  if (s.kind === 'viator') {
    const q = merchantQueries.viator.parse(query);
    if (!s.params.productCodes.split(',').includes(q.productCode))
      throw new Error('Product outside deployment scope');
    const product = await viatorRequest(s, env, '/products/' + encodeURIComponent(q.productCode));
    const ids: string[] = product.bookingQuestions || [];
    const definitions = ids.length
      ? await viatorRequest(s, env, '/products/booking-questions')
      : { bookingQuestions: [] };
    const questions = ids.map((id) => {
      const definition = definitions.bookingQuestions?.find((item: any) => item.id === id);
      if (!definition) throw new Error('Booking question specification unavailable');
      return definition;
    });
    const travelers = q.paxMix.reduce((sum, p) => sum + p.numberOfTravelers, 0);
    const bookingQuestions = questions.flatMap((question: any) =>
      Array.from({ length: question.group === 'PER_TRAVELER' ? travelers : 1 }, (_, index) => ({
        ...question,
        ...(question.group === 'PER_TRAVELER' ? { travelerNum: index + 1 } : {}),
      })),
    );
    const r = await viatorRequest(s, env, '/availability/check', q);
    return (r.bookableItems || [])
      .filter((b: any) => b.available)
      .map((b: any) => ({
        title: product.title || q.productCode,
        bookingQuestions,
        ...price(b.totalPrice?.price?.recommendedRetailPrice, r.currency),
        terms: '取消条件は予約保持時に提供元の条件を確認してください。',
        paymentHandledBy: 'provider',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        providerData: {
          query: { ...q, productOptionCode: b.productOptionCode, startTime: b.startTime },
        },
        prepareRequired: true,
      }));
  }
  if (s.kind === 'booking') {
    const q = merchantQueries.booking.parse(query);
    stayQuery.parse({ checkin: q.checkin, checkout: q.checkout, adults: q.adults });
    if (
      s.params.accommodationIds &&
      !s.params.accommodationIds.split(',').includes(String(q.accommodationId))
    )
      throw new Error('Accommodation outside deployment scope');
    const allocation = { number_of_adults: q.adults, children: [] };
    const r = await bookingRequest(s, env, '/orders/preview', {
      accommodation: {
        id: q.accommodationId,
        booker: { country: s.params.bookerCountry, platform: s.params.platform || 'desktop' },
        checkin: q.checkin,
        checkout: q.checkout,
        products: [{ id: q.productId, allocation }],
      },
    });
    const a = r.data?.accommodation;
    if (!r.data?.order_token || !a) throw new Error('Booking preview unavailable');
    return [
      {
        title: String(q.accommodationId),
        ...price(a.price?.total, a.currency?.booker || a.currency?.accommodation),
        terms: JSON.stringify(a.products?.map((p: any) => p.policies) || a.general_policies || {}),
        paymentHandledBy: 'provider',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        providerData: {
          orderToken: r.data.order_token,
          currency: a.currency?.booker || a.currency?.accommodation,
          products: a.products,
        },
      },
    ];
  }
  if (s.kind === 'expedia') {
    const q = merchantQueries.expedia.parse(query);
    stayQuery.parse({ checkin: q.checkin, checkout: q.checkout, adults: q.adults });
    if (!s.params.propertyIds.split(',').includes(q.propertyId))
      throw new Error('Property outside deployment scope');
    const u = new URL('https://api.ean.com/v3/properties/availability');
    for (const [k, v] of Object.entries({
      checkin: q.checkin,
      checkout: q.checkout,
      occupancy: String(q.adults),
      property_id: q.propertyId,
      currency: s.params.currency,
      country_code: s.params.countryCode,
      language: s.params.language,
      sales_channel: s.params.salesChannel,
      sales_environment: s.params.salesEnvironment,
    }))
      u.searchParams.set(k, v);
    const result = await expediaRequest(
      s,
      env,
      u.pathname + u.search,
      undefined,
      undefined,
      customerIp,
    );
    const rate = result[0]?.rooms
      ?.find((r: any) => r.id === q.roomId)
      ?.rates?.find((r: any) => r.id === q.rateId);
    if (!rate?.links?.price_check?.href) throw new Error('Rate not available');
    const checked = await expediaRequest(
      s,
      env,
      rate.links.price_check.href,
      undefined,
      undefined,
      customerIp,
    );
    if (checked.status !== 'matched' || !checked.links?.book?.href)
      throw new Error('Rate changed or secure payment registration is required');
    const total =
      checked.occupancy_pricing?.[String(q.adults)]?.totals?.inclusive?.request_currency;
    return [
      {
        title: q.propertyId,
        ...price(total?.value, total?.currency),
        terms: JSON.stringify(rate.cancel_penalties || []),
        paymentHandledBy: 'provider',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        providerData: { bookLink: checked.links.book.href, customerIp },
      },
    ];
  }
  throw new Error('Merchant quote unavailable');
}
export async function prepareViator(s: Source, env: Env, offer: any, id: string) {
  if (offer.providerData.hold) return offer;
  const r = await viatorRequest(s, env, '/bookings/cart/hold', {
    partnerCartRef: id,
    currency: offer.currency,
    paymentDataSubmissionMode: 'VIATOR_FORM',
    hostingUrl: env.APP_ORIGIN,
    items: [{ ...offer.providerData.query, partnerBookingRef: id }],
  });
  const item = r.items?.[0];
  if (item?.status !== 'BOOKABLE' || !r.paymentSessionToken)
    throw new Error('Viator could not hold the selected option');
  const held = Number(r.totalHeldPrice?.price?.recommendedRetailPrice);
  if (!Number.isFinite(held)) throw new Error('Held price unavailable');
  const expires =
    item.bookingHoldInfo?.availability?.validUntil || item.bookingHoldInfo?.pricing?.validUntil; // Local cap stays conservative when provider omits expiry.
  return {
    ...offer,
    amount: held,
    terms: JSON.stringify(item.cancellationPolicy || {}),
    expiresAt:
      expires && Date.parse(expires) < Date.now() + 300000
        ? expires
        : new Date(Date.now() + 300000).toISOString(),
    providerData: { ...offer.providerData, hold: r },
  };
}
export async function merchantReserve(
  s: Source,
  env: Env,
  offer: any,
  input: unknown,
  id: string,
  customerIp: string,
) {
  if (s.kind === 'viator') {
    const v = merchantInputs.viator.parse(input),
      h = offer.providerData.hold;
    if (!h) throw new Error('Prepare the provider payment form first');
    for (const question of offer.bookingQuestions || []) {
      const answer = v.answers.find(
        (a) => a.question === question.id && a.travelerNum === question.travelerNum,
      );
      if (question.required === 'MANDATORY' && !answer)
        throw new Error('Required booking question unanswered');
      if (
        answer &&
        question.allowedAnswers?.length &&
        !question.allowedAnswers.includes(answer.answer)
      )
        throw new Error('Invalid booking answer');
      if (answer && question.units?.length && !question.units.includes(answer.unit))
        throw new Error('Booking answer unit required');
    }
    const r = await viatorRequest(s, env, '/bookings/cart/book', {
      cartRef: h.cartRef,
      paymentToken: v.paymentToken,
      bookerInfo: { firstName: v.name.first, lastName: v.name.last },
      communication: { email: v.email, phone: v.phone },
      items: [{ bookingRef: h.items[0].bookingRef, bookingQuestionAnswers: v.answers }],
    });
    const item = r.items?.[0];
    return merchantState(s, item || r);
  }
  if (s.kind === 'booking') {
    const v = merchantInputs.booking.parse(input);
    if (s.params.paymentMode === 'card' && !v.card)
      throw new Error('Provider card payment is required');
    if (s.params.paymentMode === 'wallet' && v.card)
      throw new Error('Wallet connection does not accept card data');
    const r = await bookingRequest(s, env, '/orders/create', {
      order_token: offer.providerData.orderToken,
      booker: {
        name: { first_name: v.name.first, last_name: v.name.last },
        email: v.email,
        telephone: v.phone,
        address: {
          address_line: v.address.line,
          city: v.address.city,
          post_code: v.address.postCode,
          country: v.address.country.toLowerCase(),
        },
      },
      accommodation: { label: id },
      payment: {
        timing: v.paymentTiming,
        ...(v.card
          ? {
              method: 'card',
              card: {
                number: v.card.number,
                cvc: v.card.cvc,
                expiry_date: `${v.card.year}-${v.card.month}`,
                cardholder: `${v.name.first} ${v.name.last}`,
              },
            }
          : { method: 'wallet' }),
      },
    });
    const a = r.data?.accommodation;
    return {
      externalId: r.data?.order,
      status: a?.reservation ? 'confirmed' : 'unknown',
      reservationId: a?.reservation,
      paymentHandledBy: 'provider',
      actions: external(r.data?.payment?.receipt_url),
      currency: offer.currency,
    };
  }
  if (s.kind === 'expedia') {
    const v = merchantInputs.expedia.parse(input);
    const r = await expediaRequest(
      s,
      env,
      offer.providerData.bookLink,
      {
        affiliate_reference_id: id,
        email: v.email,
        phone: { country_code: v.phone.countryCode, number: v.phone.number },
        rooms: [{ given_name: v.name.first, family_name: v.name.last }],
        payments: [
          {
            type: 'customer_card',
            number: v.card.number,
            security_code: v.card.cvc,
            expiration_month: v.card.month,
            expiration_year: v.card.year,
            billing_contact: {
              given_name: v.name.first,
              family_name: v.name.last,
              address: {
                line_1: v.address.line,
                city: v.address.city,
                postal_code: v.address.postCode,
                country_code: v.address.country,
              },
            },
          },
        ],
      },
      undefined,
      customerIp,
    );
    // Booking links are retained server-side; never accepted from a client.
    return {
      externalId: r.itinerary_id,
      status: r.itinerary_id ? 'pending' : 'unknown',
      retrieveLink: r.links?.retrieve?.href,
      cancelLink: r.links?.cancel?.href,
    };
  }
  throw new Error('Merchant reservation unavailable');
}
export function merchantState(s: Source, r: any) {
  if (s.kind === 'viator')
    return {
      externalId: r.bookingRef,
      status:
        (
          {
            CONFIRMED: 'confirmed',
            PENDING: 'pending',
            CANCELLED: 'cancelled',
            CANCELED: 'cancelled',
            REJECTED: 'rejected',
          } as Record<string, string>
        )[r.status] || 'unknown',
      actions: external(r.status === 'CONFIRMED' ? r.voucherInfo?.url : undefined),
    };
  if (s.kind === 'booking') {
    const d = r.data?.[0];
    return {
      externalId: d?.id,
      status:
        (
          {
            booked: 'confirmed',
            cancelled: 'cancelled',
            cancelled_by_guest: 'cancelled',
            cancelled_by_accommodation: 'cancelled',
            stayed: 'completed',
            no_show: 'completed',
          } as Record<string, string>
        )[d?.status] || 'unknown',
    };
  }
  const rooms = r.rooms || [];
  return {
    externalId: r.itinerary_id,
    status:
      rooms.length && rooms.every((r: any) => r.status === 'canceled')
        ? 'cancelled'
        : rooms.length && rooms.every((r: any) => r.status === 'booked')
          ? 'confirmed'
          : 'pending',
    cancelLink: r.links?.cancel?.href,
    retrieveLink: r.links?.retrieve?.href,
  };
}
export async function merchantLookup(s: Source, env: Env, r: any) {
  const b = JSON.parse(r.body);
  if (s.kind === 'viator') {
    return merchantState(
      s,
      await viatorRequest(
        s,
        env,
        '/bookings/status',
        r.external_id ? { bookingRef: r.external_id } : { partnerBookingRef: r.offer_id },
      ),
    );
  }
  if (s.kind === 'booking') {
    if (r.external_id)
      return merchantState(
        s,
        await bookingRequest(s, env, '/orders/details', {
          orders: [r.external_id],
          currency: b.currency,
        }),
      );
    const start = new Date(Date.parse(r.created_at) - 60000),
      end = new Date(Math.min(Date.now(), start.getTime() + 7 * 86400000));
    const matches: any[] = [];
    let page: string | undefined;
    for (let attempt = 0; attempt < 50; attempt++) {
      const result = await bookingRequest(
        s,
        env,
        '/orders/details',
        page
          ? { page }
          : {
              created: { from: start.toISOString(), to: end.toISOString() },
              currency: b.currency,
              maximum_results: 100,
            },
      );
      matches.push(...(result.data || []).filter((d: any) => d.label === r.id));
      page = result.metadata?.next_page;
      if (!page) break;
    }
    if (page) throw new Error('Order lookup exceeded page limit; reconcile with provider');
    return matches.length === 1 ? merchantState(s, { data: matches }) : { status: 'unknown' };
  }
  if (!r.external_id) {
    const recovery = await decryptTokens(env, b.recovery),
      u = new URL('https://api.ean.com/v3/itineraries');
    u.searchParams.set('affiliate_reference_id', r.id);
    u.searchParams.set('email', recovery.email);
    const result = await expediaRequest(
      s,
      env,
      u.pathname + u.search,
      undefined,
      undefined,
      b.customerIp,
    );
    const matches = result.filter((i: any) => i.affiliate_reference_id === r.id);
    return matches.length === 1 ? merchantState(s, matches[0]) : { status: 'unknown' };
  }
  return merchantState(
    s,
    await expediaRequest(
      s,
      env,
      b.retrieveLink || `/v3/itineraries/${encodeURIComponent(r.external_id)}`,
      undefined,
      undefined,
      b.customerIp,
    ),
  );
}
export async function merchantCancel(s: Source, env: Env, r: any, reasonCode?: string) {
  const b = JSON.parse(r.body);
  if (s.kind === 'viator') {
    await viatorRequest(s, env, `/bookings/${encodeURIComponent(r.external_id)}/cancel`, {
      reasonCode,
    });
    return merchantLookup(s, env, r);
  }
  if (s.kind === 'booking') {
    await bookingRequest(s, env, '/orders/cancel', {
      order: r.external_id,
      accommodation: { reservation: b.reservationId, reason: 'guest_request' },
    });
    return merchantLookup(s, env, r);
  }
  if (!b.cancelLink) throw new Error('Provider cancellation link unavailable');
  await expediaRequest(s, env, b.cancelLink, undefined, 'DELETE', b.customerIp);
  return merchantLookup(s, env, r);
}

export async function cancellationTerms(s: Source, env: Env, r: any) {
  if (s.kind === 'viator') {
    const q = await viatorRequest(
      s,
      env,
      `/bookings/${encodeURIComponent(r.external_id)}/cancel-quote`,
    );
    const reasons = await viatorRequest(s, env, '/bookings/cancel-reasons');
    return { terms: q.refundDetails, status: q.status, reasons: reasons.reasons };
  }
  return {
    terms: JSON.parse(r.body).terms,
    notice: 'この予約だけを取り消します。返金・取消費用は提供元の条件によります。',
  };
}
