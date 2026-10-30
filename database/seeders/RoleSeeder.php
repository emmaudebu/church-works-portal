<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Seed the three application roles.
     */
    public function run(): void
    {
        foreach (['super_admin', 'dept_admin', 'member'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }
}
