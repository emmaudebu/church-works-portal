const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
});

/** Amounts are stored in kobo. */
export function naira(kobo: number) {
    return formatter.format(kobo / 100);
}
