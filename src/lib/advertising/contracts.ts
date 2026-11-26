/** Shared contracts only; declaring a destination does not enable its delivery. */
export type AdvertisingDestination = 'meta' | 'tiktok' | 'google_ads';
export type StoreEnvironment = 'production' | 'sandbox';

export type VerifiedPurchaseEvent = Readonly<{
  schemaVersion: 1;
  id: string;
  type: 'subscription_purchased' | 'subscription_renewed';
  occurredAt: number;
  environment: StoreEnvironment;
  store: 'ios' | 'android';
  payment: Readonly<{
    // Preserve the existing ledger reference and Meta order ID during rollout.
    reference: string;
    productId: string;
    plan: 'monthly' | 'yearly';
    value: number;
    currency: string;
  }>;
}>;

export type DeliveryContext = Readonly<{
  // Evaluated by the worker immediately before delivery, not supplied by clients.
  advertisingAllowed: boolean;
  destinationAnonymousId?: string;
}>;

export type DeliveryResult =
  | { state: 'sent' }
  | { state: 'review' | 'uncertain' | 'excluded'; error: string };

export interface ConversionAdapter {
  readonly destination: AdvertisingDestination;
  deliver(event: VerifiedPurchaseEvent, context: DeliveryContext): Promise<DeliveryResult>;
}

/** Reporting imports are separate from outbound conversions and their consent. */
export type CampaignDailyMetrics = Readonly<{
  destination: AdvertisingDestination;
  accountId: string;
  campaignId: string;
  campaignName: string;
  date: string;
  timezone: string;
  currency: string;
  // Decimal text avoids assuming all currencies use two decimal places.
  spend: string;
  impressions: number | null;
  clicks: number | null;
  reportedInstalls: number | null;
  reportedPurchases: number | null;
  attributionWindow: string | null;
  // YouTube is Google inventory, not a second conversion destination.
  channel: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'google_other' | 'unallocated';
  fetchedAt: number;
}>;

export interface CampaignReportingAdapter {
  readonly destination: AdvertisingDestination;
  fetchDailyMetrics(input: {
    accountId: string;
    startDate: string;
    endDate: string;
    cursor?: string;
  }): Promise<{ rows: readonly CampaignDailyMetrics[]; nextCursor?: string }>;
}
