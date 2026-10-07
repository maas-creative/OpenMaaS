import type { Action, Activity } from './model';
export interface Offer {
  id: string;
  providerId: string;
  expiresAt: string;
  amount: number;
  currency: string;
  terms: string;
  paymentHandledBy: 'provider' | 'deployment';
}
export interface Reservation {
  id: string;
  providerId: string;
  externalId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'unknown';
  offerId: string;
  actions: Action[];
}
export interface Entitlement {
  id: string;
  providerId: string;
  externalId: string;
  status: 'pending' | 'valid' | 'used' | 'cancelled';
  display: { type: 'url' | 'text'; value: string };
  terms: string;
}
export interface ReservationConnector {
  capabilities: readonly ('search' | 'quote' | 'reserve' | 'lookup' | 'fulfill' | 'cancel')[];
  search(query: { date: string; place?: string }): Promise<Activity[]>;
  quote?(input: unknown): Promise<Offer>;
  reserve?(offer: Offer, key: string): Promise<Reservation>;
  lookup?(externalId: string): Promise<Reservation>;
  fulfill?(externalId: string): Promise<Entitlement[]>;
  cancel?(externalId: string, key: string): Promise<Reservation>;
}
export function checkOffer(offer: Offer, at = Date.now()) {
  if (
    !Number.isFinite(offer.amount) ||
    offer.amount < 0 ||
    Date.parse(offer.expiresAt) <= at ||
    !Number.isFinite(Date.parse(offer.expiresAt))
  )
    throw new Error('Invalid or expired offer');
  return offer;
}
export function assertCapability(
  connector: { capabilities: readonly string[] },
  operation: string,
) {
  if (!connector.capabilities.includes(operation))
    throw new Error(`Unsupported operation: ${operation}`);
}
