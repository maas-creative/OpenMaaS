import {
  checkOffer,
  assertCapability,
  type ReservationConnector,
  type Reservation,
} from '../src/contracts';
// Run against a sandbox connector only. Search-only integrations skip transaction checks.
export async function verifyReservationContract(
  connector: ReservationConnector,
  input: unknown,
  key: string,
) {
  if (!connector.capabilities.includes('reserve')) return { status: 'search-only' as const };
  for (const operation of ['quote', 'lookup']) assertCapability(connector, operation);
  if (!connector.quote || !connector.reserve || !connector.lookup)
    throw new Error('Declared transaction capability is missing its implementation');
  const offer = checkOffer(await connector.quote(input));
  const first = await connector.reserve(offer, key),
    repeat = await connector.reserve(offer, key);
  if (!first.externalId || first.externalId !== repeat.externalId)
    throw new Error('Duplicate reservation: idempotency contract failed');
  const current = await connector.lookup(first.externalId);
  const states = ['pending', 'confirmed', 'cancelled', 'unknown'];
  if (!states.includes(current.status)) throw new Error('Invalid reservation state');
  if (current.status !== 'confirmed')
    return { status: 'requires-reconciliation' as const, reservation: current };
  if (connector.capabilities.includes('fulfill')) {
    if (!connector.fulfill) throw new Error('Missing fulfillment implementation');
    const tickets = await connector.fulfill(current.externalId);
    if (
      tickets.some(
        (t) =>
          t.providerId !== current.providerId ||
          !t.externalId ||
          !['pending', 'valid', 'used', 'cancelled'].includes(t.status),
      )
    )
      throw new Error('Invalid entitlement');
  }
  let cancelled: Reservation | undefined;
  if (connector.capabilities.includes('cancel')) {
    if (!connector.cancel) throw new Error('Missing cancellation implementation');
    await connector.cancel(current.externalId, `${key}:cancel`);
    await connector.cancel(current.externalId, `${key}:cancel`);
    cancelled = await connector.lookup(current.externalId);
    if (cancelled.status !== 'cancelled')
      return { status: 'requires-reconciliation' as const, reservation: cancelled };
  }
  return {
    status: 'verified' as const,
    reservation: cancelled || current,
    paymentHandledBy: offer.paymentHandledBy,
  };
}
