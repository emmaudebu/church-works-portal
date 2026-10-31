<?php

namespace App\Support;

use App\Models\Department;
use App\Models\User;

class CurrentDepartment
{
    public const SESSION_KEY = 'current_department_id';

    /**
     * The department an admin is working in. Department admins are fixed to their
     * own; a super admin picks one, and null means all departments.
     */
    public static function idFor(User $user): ?int
    {
        if (! $user->hasRole('super_admin')) {
            return $user->department_id;
        }

        $id = session(self::SESSION_KEY);

        return $id && Department::whereKey($id)->exists() ? (int) $id : null;
    }
}
