export function calcBilling(rate: number, days: number) {
  const cost = rate * days;
  const vat = Math.round(cost * 0.16);
  return { cost, vat, total: cost + vat };
}

export function calcLocalBilling(m: number, a: number) {
  const net = m * 8500 + a * 7000;
  const vat = Math.round(net * 0.16);
  return { net, vat, gross: net + vat };
}
