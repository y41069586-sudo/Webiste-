/** Realized economics only. Projected contract revenue is never counted as cash. */
export interface RealizedEconomics {
  setupReceivedCents: number;
  monthlyReceivedCents: number;
  refundsCents: number;
  letterCostCents: number;
  hostingCostCents: number;
  domainCostCents: number;
  paymentFeeCents: number;
  careMinutes: number;
  careHourlyCostCents: number;
  deliveredLetters: number;
  buyers: number;
}
export function contributionV4(i: RealizedEconomics) {
  for (const value of Object.values(i)) if (!Number.isFinite(value) || value < 0) throw new Error('Ungültige Wirtschaftsdaten.');
  const receivedCents = i.setupReceivedCents + i.monthlyReceivedCents - i.refundsCents;
  const careCostCents = Math.round((i.careMinutes * i.careHourlyCostCents) / 60);
  const costsCents = i.letterCostCents + i.hostingCostCents + i.domainCostCents + i.paymentFeeCents + careCostCents;
  const contributionCents = receivedCents - costsCents;
  return {
    receivedCents,
    costsCents,
    careCostCents,
    contributionCents,
    perDeliveredLetterCents: i.deliveredLetters ? contributionCents / i.deliveredLetters : null,
    perBuyerCents: i.buyers ? contributionCents / i.buyers : null,
  };
}
