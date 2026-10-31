<?php

namespace App\Models;

use Database\Factories\DepartmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'icon', 'description', 'status'])]
class Department extends Model
{
    /** @use HasFactory<DepartmentFactory> */
    use HasFactory;

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
