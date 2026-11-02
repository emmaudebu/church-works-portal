<?php

namespace App\Support;

use App\Models\Due;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\PaymentDecided;
use App\Notifications\PaymentSubmitted;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Permission;

/**
 * The queue of proofs of payment waiting for someone to approve them.
 */
class PaymentReviews
{
    /**
     * @return Builder<Payment>
     */
    private static function waiting(User $admin): Builder
    {
        return Payment::whereIn('due_id', Due::managedBy($admin)->select('id'))
            ->where('status', 'under_review');
    }

    /**
     * How many proofs an admin can see waiting, a multi-month payment being one.
     */
    public static function count(User $admin): int
    {
        return self::waiting($admin)->distinct('batch')->count('batch');
    }

    /**
     * One row for each proof, however many months it covers.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public static function list(User $admin): Collection
    {
        return self::rows(self::waiting($admin)->with('user:id,full_name')->oldest()->get())
            ->map(fn (array $review) => [...$review, 'own' => $review['user_id'] === $admin->id])
            ->values();
    }

    /**
     * Group payments into one row for each proof.
     *
     * @param  Collection<int, Payment>  $payments
     * @return Collection<int, array<string, mixed>>
     */
    public static function rows(Collection $payments): Collection
    {
        return $payments
            ->groupBy(fn (Payment $payment) => $payment->batch ?? $payment->reference)
            ->map(function (Collection $batch) {
                $first = $batch->first();

                return [
                    ...$first->toRow(),
                    'user_id' => $first->user_id,
                    'period' => Dues::rangeLabel($batch->pluck('period')->sort()->values()->all()),
                    'amount' => $batch->sum('amount'),
                    'submitted_at' => $first->created_at->format('j M Y, g:i A'),
                ];
            })
            ->values();
    }

    /**
     * Tell the department's approvers about a new proof. That is the Financial
     * Secretary unless the office is empty or they sent it, then the Head.
     *
     * @param  Collection<int, Payment>  $payments
     */
    public static function notifyApprovers(Collection $payments): void
    {
        $first = $payments->first();

        Notification::send(
            self::approvers($first->user),
            new PaymentSubmitted($first->user->full_name, $first->purpose, $payments->sum('amount')),
        );
    }

    /**
     * @param  Collection<int, Payment>  $payments
     */
    public static function notifyMember(Collection $payments, bool $approved): void
    {
        $first = $payments->first();

        if ($first->user->pushSubscriptions()->exists()) {
            $first->user->notify(new PaymentDecided($first->purpose, $approved));
        }
    }

    /**
     * @return Collection<int, User>
     */
    private static function approvers(User $payer): Collection
    {
        $offices = Permission::findByName('approve_payments', 'web')->roles->pluck('name')->diff([Offices::HEAD]);

        $people = fn (Collection|array $roles) => User::where('department_id', $payer->department_id)
            ->where('status', 'active')
            ->whereKeyNot($payer->id)
            ->whereHas('roles', fn ($query) => $query->whereIn('name', $roles))
            ->get();

        $approvers = $people($offices);

        return ($approvers->isNotEmpty() ? $approvers : $people([Offices::HEAD]))
            ->filter(fn (User $approver) => $approver->pushSubscriptions()->exists());
    }
}
