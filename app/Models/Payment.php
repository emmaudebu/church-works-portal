<?php

namespace App\Models;

use App\Support\Dues;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'due_id', 'purpose', 'period', 'amount', 'reference', 'batch', 'status', 'method', 'receipt', 'rejection_reason', 'paid_at', 'receipt_seen_at', 'recorded_by'])]
class Payment extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['paid_at' => 'datetime', 'receipt_seen_at' => 'datetime', 'amount' => 'integer'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Due, $this>
     */
    public function due(): BelongsTo
    {
        return $this->belongsTo(Due::class);
    }

    /**
     * Every month paid for together with this one, including itself.
     *
     * @return Collection<int, Payment>
     */
    public function withBatch(): Collection
    {
        return $this->batch ? self::where('batch', $this->batch)->orderBy('period')->get() : $this->newCollection([$this]);
    }

    /**
     * Find what a Paystack reference paid for.
     *
     * @return Collection<int, Payment>
     */
    public static function forReference(string $reference): Collection
    {
        return self::where('batch', $reference)->orWhere('reference', $reference)->orderBy('period')->get();
    }

    /**
     * @return array<string, mixed>
     */
    public function toRow(): array
    {
        return [
            ...$this->only(['id', 'purpose', 'amount', 'reference', 'batch', 'status', 'method']),
            'period' => Dues::periodLabel($this->period),
            'paid_at' => $this->paid_at?->format('j M Y, g:i A'),
            'member' => $this->user?->full_name,
            'receipt_url' => $this->receipt ? route('payments.receipt', $this) : null,
            'download_url' => $this->status === 'success' ? route('payments.receipt.download', $this) : null,
            'image_url' => $this->status === 'success' ? route('payments.receipt.download', [$this, 'jpg']) : null,
        ];
    }
}
