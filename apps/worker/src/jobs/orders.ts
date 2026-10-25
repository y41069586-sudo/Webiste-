import { sendCancellationInvoice, sendOrderInvoice, sendPaymentInvoice } from '@wbm/core/render';
import { defineJob } from '../runtime';

/** Rechnung (PDF) erzeugen und senden: Bestellung, Monatsrate bzw. Stornorechnung nach Erstattung. */
defineJob('send-invoice', async (data) => {
  if (data.kind === 'cancellation') return sendCancellationInvoice(data.orderId, data.paymentId);
  if (data.kind === 'payment' && data.paymentId) return sendPaymentInvoice(data.paymentId);
  return sendOrderInvoice(data.orderId);
});
