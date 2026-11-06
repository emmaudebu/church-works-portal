<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['service_id', 'user_id', 'method', 'checked_in_at', 'checked_out_at', 'recorded_by', 'checked_out_by'])]
#[Table('attendance', timestamps: false)]
class Attendance extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['checked_in_at' => 'datetime', 'checked_out_at' => 'datetime'];
    }

    /**
     * Minutes between checking in and clocking out, once both are known.
     */
    public function minutesServed(): ?int
    {
        return $this->checked_out_at ? (int) $this->checked_in_at->diffInMinutes($this->checked_out_at) : null;
    }

    /**
     * A length of time such as "2h 15m".
     */
    public static function durationLabel(?int $minutes): ?string
    {
        if ($minutes === null) {
            return null;
        }

        $hours = intdiv($minutes, 60);

        return $hours ? "{$hours}h ".($minutes % 60).'m' : "{$minutes}m";
    }

    /**
     * Where someone stands on clocking out: "out" once done, "pending" while
     * the service is on or clock-out is still open, and "missing" once it has
     * closed. Missing is only flagged for services that used clock-out, so
     * services held before it existed are not marked.
     */
    public function clockOutStatus(Service $service, bool $serviceUsedClockOut): string
    {
        return match (true) {
            $this->checked_out_at !== null => 'out',
            now()->lte($service->clockOutClosesAt()) => 'pending',
            $serviceUsedClockOut => 'missing',
            default => 'unrecorded',
        };
    }

    /**
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function checkOutRecorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_out_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
