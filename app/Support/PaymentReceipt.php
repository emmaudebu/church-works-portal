<?php

namespace App\Support;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Number;

/**
 * The receipt a member downloads for a payment that went through, covering
 * every month paid for in that one transaction.
 */
class PaymentReceipt
{
    private const METHODS = [
        'transfer' => 'Bank transfer',
        'paystack' => 'Online (Paystack)',
        'cash' => 'Cash',
    ];

    /**
     * @param  Collection<int, Payment>  $payments
     */
    public static function number(Collection $payments): string
    {
        return 'RCP-'.str_pad((string) $payments->min('id'), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Everything the receipt shows.
     *
     * @param  Collection<int, Payment>  $payments
     * @return array<string, mixed>
     */
    public static function details(Collection $payments): array
    {
        $first = $payments->first();
        $member = $first->user;
        $approver = $first->recorded_by ? User::find($first->recorded_by) : null;
        $periods = $payments->pluck('period')->sort()->values()->all();
        $total = (int) $payments->sum('amount');

        return [
            'number' => self::number($payments),
            'church' => Settings::churchName(),
            'department' => $member->department?->name === Settings::churchName() ? null : $member->department?->name,
            'logo' => self::logoPath('dark'),
            'watermark' => self::logoPath('light'),
            'member' => [
                'name' => $member->full_name,
                'member_id' => $member->member_id,
                'unit' => $member->unit,
                'phone' => $member->phone,
            ],
            'purpose' => $first->purpose,
            'covers' => Dues::rangeLabel($periods),
            'months' => $periods === [Dues::ONE_OFF] ? [] : array_map(
                fn (string $period) => Dues::periodLabel($period),
                $periods,
            ),
            'quantity' => count($periods),
            'rate' => self::naira((int) $first->amount),
            'total' => self::naira($total),
            'in_words' => self::inWords($total),
            'method' => self::METHODS[$first->method] ?? ucfirst($first->method),
            'reference' => $first->batch ?? $first->reference,
            'paid_at' => $first->paid_at?->format('j M Y, g:i A'),
            'approver' => $approver ? ['name' => $approver->full_name, 'office' => $approver->office()] : null,
            'issued_at' => now()->format('j F Y'),
        ];
    }

    /**
     * The newest payment a member has not downloaded a receipt for yet, so
     * they can be asked to.
     *
     * @return array<string, mixed>|null
     */
    public static function waiting(User $user): ?array
    {
        $payment = $user->payments()
            ->where('status', 'success')
            ->whereNull('receipt_seen_at')
            ->latest('paid_at')
            ->first();

        if (! $payment) {
            return null;
        }

        $payments = $payment->withBatch()->where('status', 'success');

        return [
            'id' => $payment->id,
            'purpose' => $payment->purpose,
            'covers' => Dues::rangeLabel($payments->pluck('period')->sort()->values()->all()),
            'amount' => $payments->sum('amount'),
            'method' => $payment->method,
            'download_url' => route('payments.receipt.download', $payment),
            'image_url' => route('payments.receipt.download', [$payment, 'jpg']),
        ];
    }

    /**
     * An amount in kobo written out, such as "Six thousand naira only".
     */
    public static function inWords(int $kobo): string
    {
        $naira = intdiv($kobo, 100);
        $words = ucfirst(Number::spell($naira)).' naira';

        if ($kobo % 100 > 0) {
            $words .= ' and '.Number::spell($kobo % 100).' kobo';
        }

        return $words.' only';
    }

    private static function naira(int $kobo): string
    {
        return '₦'.number_format($kobo / 100, 2);
    }

    /**
     * The church logo as a file the PDF renderer can read.
     */
    private static function logoPath(string $variant): string
    {
        $path = Settings::get("logo_{$variant}");

        return $path && Storage::disk('public')->exists($path)
            ? Storage::disk('public')->path($path)
            : public_path("images/logo-{$variant}.png");
    }
}
