<?php

namespace App\Models\Concerns;

use App\Models\User;
use App\Support\CurrentDepartment;
use Illuminate\Database\Eloquent\Builder;

trait ManagedByDepartment
{
    /**
     * Limit a query to what an admin works with: a department admin sees their
     * own department, a super admin sees their selected department or everything.
     *
     * @param  Builder<static>  $query
     */
    public function scopeManagedBy(Builder $query, User $admin): void
    {
        $departmentId = CurrentDepartment::idFor($admin);

        if ($departmentId) {
            $query->where('department_id', $departmentId);
        } elseif (! $admin->hasRole('super_admin')) {
            $query->whereRaw('1 = 0');
        }
    }
}
