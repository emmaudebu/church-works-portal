<?php

namespace App\Models;

use App\Models\Concerns\ManagedByDepartment;
use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

#[Fillable(['department_id', 'type', 'recurring_key', 'title', 'date', 'opens_at', 'closes_at', 'ends_at', 'is_open'])]
class Service extends Model
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory, ManagedByDepartment, SoftDeletes;

    /** How long after a service ends members can still be scanned out. */
    public const CLOCK_OUT_HOURS = 3;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'opens_at' => 'datetime',
            'closes_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_open' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return HasMany<Attendance, $this>
     */
    public function attendance(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Services that really took place. Auto-generated services nobody checked in
     * to, such as a cancelled midweek meeting, must not mark everyone absent.
     *
     * @param  Builder<Service>  $query
     */
    public function scopeHeld(Builder $query): void
    {
        $query->where('opens_at', '<=', now())->whereHas('attendance');
    }

    public function acceptsCheckIns(): bool
    {
        return $this->is_open && now()->between($this->opens_at, $this->closes_at);
    }

    /**
     * When the service ends and clocking out opens. Without its own end time a
     * service ends when check-in closes.
     */
    public function endsAt(): Carbon
    {
        return $this->ends_at ?? $this->closes_at;
    }

    public function clockOutClosesAt(): Carbon
    {
        return $this->endsAt()->copy()->addHours(self::CLOCK_OUT_HOURS);
    }

    public function hasEnded(): bool
    {
        return now()->gte($this->endsAt());
    }

    /**
     * Whether members can be scanned out at the exit now.
     */
    public function acceptsCheckOuts(): bool
    {
        return now()->between($this->endsAt(), $this->clockOutClosesAt());
    }

    /**
     * Open attendance now, stretching the window if it is outside it.
     */
    public function open(): void
    {
        $this->update([
            'is_open' => true,
            'opens_at' => $this->opens_at->min(now()),
            'closes_at' => $this->closes_at->max(now()->addHours(2)),
        ]);
    }
}
