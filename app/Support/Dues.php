<?php

namespace App\Support;

use App\Models\Due;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Works out what each member owes and records what they have paid.
 */
class Dues
{
    public const ONE_OFF = 'once';

    public const MAX_MONTHS = 24;

    public static function periodLabel(string $period): string
    {
        return $period === self::ONE_OFF ? 'One-off' : Carbon::parse("{$period}-01")->format('F Y');
    }

    /**
     * The periods a due applies to a member. Monthly dues run from when the due
     * began or the member joined, whichever is later.
     *
     * @return array<int, string>
     */
    public static function periods(Due $due, User $user): array
    {
        if ($due->starts_on->isFuture()) {
            return [];
        }

        if ($due->type === 'levy') {
            return [self::ONE_OFF];
        }

        $start = $due->starts_on->copy()->max($user->created_at)->startOfMonth();
        $periods = [];

        for ($month = $start; $month->lte(now()); $month = $month->copy()->addMonth()) {
            $periods[] = $month->format('Y-m');
        }

        return $periods;
    }

    /**
     * Everything a member still owes, oldest first. A transfer stays owing until
     * an admin approves its receipt, but it can't be paid a second time meanwhile.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public static function owing(User $user): Collection
    {
        if (! $user->department_id) {
            return collect();
        }

        $payments = Payment::where('user_id', $user->id)
            ->whereIn('status', ['success', 'under_review', 'rejected'])
            ->latest('id')
            ->get(['due_id', 'period', 'status', 'rejection_reason']);

        $status = fn (string $wanted) => $payments->where('status', $wanted)
            ->keyBy(fn (Payment $payment) => "{$payment->due_id}:{$payment->period}");

        $paid = $status('success');
        $inReview = $status('under_review');
        $rejected = $payments->where('status', 'rejected')->reverse()
            ->keyBy(fn (Payment $payment) => "{$payment->due_id}:{$payment->period}");

        return Due::where('department_id', $user->department_id)
            ->where('is_active', true)
            ->orderBy('starts_on')
            ->get()
            ->flatMap(fn (Due $due) => collect(self::periods($due, $user))
                ->reject(fn (string $period) => $paid->has("{$due->id}:{$period}"))
                ->map(fn (string $period) => [
                    'due_id' => $due->id,
                    'title' => $due->title,
                    'period' => $period,
                    'period_label' => self::periodLabel($period),
                    'amount' => $due->amount,
                    'under_review' => $inReview->has("{$due->id}:{$period}"),
                    'rejection_reason' => $rejected->get("{$due->id}:{$period}")?->rejection_reason,
                ]))
            ->values();
    }

    /**
     * The next periods a member can pay for, oldest first, running on into future
     * months so dues can be paid ahead. Nobody can skip a month they owe.
     *
     * @return array<int, string>
     */
    public static function payablePeriods(User $user, Due $due, int $months = 1, ?string $from = null): array
    {
        if (! $due->is_active || $due->department_id !== $user->department_id || $due->starts_on->isFuture()) {
            return [];
        }

        $taken = Payment::where('user_id', $user->id)
            ->where('due_id', $due->id)
            ->whereIn('status', ['success', 'under_review'])
            ->pluck('period')
            ->flip();

        if ($due->type === 'levy') {
            return $taken->has(self::ONE_OFF) ? [] : [self::ONE_OFF];
        }

        $month = $from
            ? Carbon::parse("{$from}-01")
            : $due->starts_on->copy()->max($user->created_at)->startOfMonth();

        $periods = [];

        while (count($periods) < $months) {
            $period = $month->format('Y-m');

            if (! $taken->has($period)) {
                $periods[] = $period;
            }

            $month = $month->copy()->addMonth();
        }

        return $periods;
    }

    /**
     * What a member can choose to pay, with enough months for any choice.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public static function payable(User $user): Collection
    {
        if (! $user->department_id) {
            return collect();
        }

        return Due::where('department_id', $user->department_id)
            ->where('is_active', true)
            ->orderBy('starts_on')
            ->get()
            ->map(fn (Due $due) => [
                ...$due->only(['title', 'type', 'amount']),
                'due_id' => $due->id,
                'periods' => array_map(self::periodLabel(...), self::payablePeriods($user, $due, self::MAX_MONTHS)),
            ])
            ->filter(fn (array $due) => $due['periods'] !== [])
            ->values();
    }

    /**
     * Describe a run of periods, such as "May 2026 to October 2026 (6 months)".
     *
     * @param  array<int, string>  $periods
     */
    public static function rangeLabel(array $periods): string
    {
        $count = count($periods);

        return $count > 1
            ? self::periodLabel($periods[0]).' to '.self::periodLabel($periods[$count - 1])." ({$count} months)"
            : self::periodLabel($periods[0]);
    }

    public static function isOwing(User $user, Due $due, string $period): bool
    {
        return self::owing($user)->contains(
            fn (array $item) => $item['due_id'] === $due->id && $item['period'] === $period && ! $item['under_review'],
        );
    }

    /**
     * Mark a payment as received. Safe to call twice for the same payment, which
     * happens when the webhook and the browser return both report it.
     */
    public static function markPaid(Payment $payment, ?User $admin = null): void
    {
        Payment::whereKey($payment->id)
            ->where('status', '!=', 'success')
            ->update(['status' => 'success', 'paid_at' => now(), 'recorded_by' => $admin?->id]);
    }

    /**
     * Apply Paystack's answer to everything one transaction paid for. It only
     * counts when Paystack says it succeeded for the full total in naira.
     *
     * @param  EloquentCollection<int, Payment>  $payments
     * @param  array<string, mixed>  $transaction
     */
    public static function settle(EloquentCollection $payments, array $transaction): bool
    {
        $valid = ($transaction['status'] ?? null) === 'success'
            && (int) ($transaction['amount'] ?? 0) === (int) $payments->sum('amount')
            && ($transaction['currency'] ?? null) === 'NGN';

        $payments->each(function (Payment $payment) use ($valid) {
            if ($valid) {
                self::markPaid($payment);
            } elseif ($payment->status === 'pending') {
                $payment->update(['status' => 'failed']);
            }
        });

        return $valid;
    }
}
