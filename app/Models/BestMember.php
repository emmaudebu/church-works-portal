<?php

namespace App\Models;

use App\Support\Dues;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['department_id', 'user_id', 'period', 'score', 'attendance_rate', 'punctuality', 'days_attended', 'days_held'])]
class BestMember extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['score' => 'float'];
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * What the public website shows: no scores, and nothing for someone who is
     * no longer active or has chosen to stay off the site.
     *
     * @return array<string, mixed>|null
     */
    public function toPublicCard(): ?array
    {
        if (! $this->user->isActive() || ! $this->user->show_on_site) {
            return null;
        }

        return collect($this->toCard())->only(['full_name', 'unit', 'department', 'photo_url', 'month'])->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function toCard(): array
    {
        return [
            ...$this->only(['id', 'user_id', 'score', 'attendance_rate', 'punctuality', 'days_attended', 'days_held']),
            'full_name' => $this->user->full_name,
            'unit' => $this->user->unit,
            'department' => $this->department->name,
            'photo_url' => $this->user->publicPhotoUrl(),
            'month' => Dues::periodLabel($this->period),
        ];
    }
}
