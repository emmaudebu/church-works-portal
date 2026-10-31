<?php

namespace App\Models;

use Database\Factories\DepartmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

#[Fillable(['name', 'slug', 'icon', 'description', 'image', 'about', 'status'])]
class Department extends Model
{
    /** @use HasFactory<DepartmentFactory> */
    use HasFactory;

    /**
     * Pictures for departments that have not uploaded their own.
     */
    private const FALLBACK_IMAGES = ['gathering', 'stage', 'praise', 'auditorium', 'worship'];

    public function imageUrl(): string
    {
        return $this->image
            ? Storage::disk('public')->url($this->image)
            : '/images/site/'.self::FALLBACK_IMAGES[$this->id % count(self::FALLBACK_IMAGES)].'.jpg';
    }

    /**
     * The fields a card or page needs.
     *
     * @return array<string, mixed>
     */
    public function toCard(): array
    {
        return [
            ...$this->only(['id', 'name', 'slug', 'icon', 'description', 'about', 'status']),
            'members_count' => (int) ($this->members_count ?? 0),
            'image_url' => $this->imageUrl(),
        ];
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Active departments first, then alphabetical, each with its active member count.
     *
     * @param  Builder<Department>  $query
     */
    public function scopeForDisplay(Builder $query): void
    {
        $query->withCount(['users as members_count' => fn (Builder $users) => $users->where('status', 'active')])
            ->orderByRaw("status = 'active' desc")
            ->orderBy('name');
    }
}
