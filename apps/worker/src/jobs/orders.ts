import { sendCancellationInvoice, sendOrderInvoice } from '@wbm/core/render';
import { defineJob } from '../runtime';

/** Rechnung (PDF) erzeugen und mit der Bestellbestätigung senden bzw. Stornorechnung nach Erstattung. */
defineJob('send-invoice', async (data) =>
  data.kind === 'cancellation' ? sendCancellationInvoice(data.orderId) : sendOrderInvoice(data.orderId),
);
