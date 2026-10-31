<?php

namespace Database\Seeders;

use App\Support\Offices;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Seed the roles, offices and permissions. Permissions a super admin has
     * already changed are left alone.
     */
    public function run(): void
    {
        foreach (Offices::permissions() as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        foreach (['super_admin', 'member', ...Offices::roles()] as $name) {
            $role = Role::findOrCreate($name, 'web');

            if ($name === Offices::HEAD || $name === 'vice_head' && $role->permissions()->doesntExist()) {
                $role->syncPermissions(Offices::permissions());
            } elseif (isset(Offices::DEFAULTS[$name]) && $role->permissions()->doesntExist()) {
                $role->syncPermissions(Offices::DEFAULTS[$name]);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
