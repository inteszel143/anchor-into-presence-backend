import type { ConversionAdapter, VerifiedPurchaseEvent } from '../contracts';

export function metaPurchasePayload(event: VerifiedPurchaseEvent) {
  if (event.environment !== 'production' || !Number.isFinite(event.payment.value) || event.payment.value <= 0) {
    throw new Error('Only production paid transactions can be advertised');
  }
  return { _eventName: 'fb_mobile_purchase', _logTime: Math.floor(event.occurredAt / 1000),
    _valueToSum: event.payment.value, fb_currency: event.payment.currency, fb_content_id: event.payment.productId,
    fb_content_type: 'product', fb_order_id: event.payment.reference, subscription_plan: event.payment.plan,
    payment_kind: event.type === 'subscription_renewed' ? 'renewal' : 'initial' };
}

type MetaConfiguration = { appId: string; accessToken: string; graphVersion: string };

export function createMetaAdapter(config: MetaConfiguration, request: typeof fetch = fetch): ConversionAdapter {
  if (!/^\d+$/.test(config.appId) || !config.accessToken || !/^v\d+\.0$/.test(config.graphVersion)) {
    throw new Error('Meta delivery configuration missing');
  }
  return {
    destination: 'meta',
    async deliver(event, context) {
      if (!context.advertisingAllowed || !context.destinationAnonymousId) {
        return { state: 'excluded', error: 'No current consent/identity' };
      }
      if (event.environment !== 'production' || event.payment.value <= 0) {
        return { state: 'excluded', error: 'Only production paid transactions can be advertised' };
      }
      if (event.occurredAt < Date.now() - 7 * 86400000) {
        return { state: 'excluded', error: 'Stale event' };
      }
      try {
        const response = await request(`https://graph.facebook.com/${config.graphVersion}/${config.appId}/activities`, {
          method: 'POST', signal: AbortSignal.timeout(15000), redirect: 'error',
          body: new URLSearchParams({ access_token: config.accessToken, event: 'CUSTOM_APP_EVENTS',
            anon_id: context.destinationAnonymousId, advertiser_tracking_enabled: '1', application_tracking_enabled: '1',
            custom_events: JSON.stringify([metaPurchasePayload(event)]), }),
        });
        const body = await response.json();
        if (!response.ok || body.success !== true) {
          return { state: 'review', error: `Meta rejected delivery (HTTP ${response.status})` };
        }
        return { state: 'sent' };
      } catch {
        // A transport failure may happen after acceptance. Never blindly retry.
        return { state: 'uncertain', error: 'Delivery outcome unknown; reconcile before replay' };
      }
    },
  };
}
