<?php

namespace App\Models;

use App\Models\Concerns\ManagedByDepartment;
use Database\Factories\ElectionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['department_id', 'title', 'starts_at', 'ends_at', 'results_public'])]
class Election extends Model
{
    /** @use HasFactory<ElectionFactory> */
    use HasFactory, ManagedByDepartment;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'results_public' => 'boolean',
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
     * @return HasMany<Position, $this>
     */
    public function positions(): HasMany
    {
        return $this->hasMany(Position::class)->orderBy('sort_order')->orderBy('id');
    }

    public function status(): string
    {
        return match (true) {
            now()->lt($this->starts_at) => 'upcoming',
            now()->gt($this->ends_at) => 'closed',
            default => 'open',
        };
    }

    public function isOpen(): bool
    {
        return $this->status() === 'open';
    }

    public function hasStarted(): bool
    {
        return now()->gte($this->starts_at);
    }

    public function hasVotes(): bool
    {
        return Vote::whereIn('position_id', $this->positions()->select('positions.id'))->exists();
    }
}
