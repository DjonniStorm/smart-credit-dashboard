export function monthlyPayment(
  amount: number,
  termMonths: number,
  ratePercent: number,
): number {
  const monthlyRate = ratePercent / 100 / 12;
  if (monthlyRate === 0) {
    return Math.round(amount / termMonths);
  }
  return Math.round(
    (amount * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths),
  );
}
