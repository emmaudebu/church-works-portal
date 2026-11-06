<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Give gallery uploads their own permission, which members can be given as a
     * duty. Offices that already manage the gallery keep being able to upload.
     */
    public function up(): void
    {
        Permission::findOrCreate('upload_gallery', 'web');

        Role::whereHas('permissions', fn ($permissions) => $permissions->where('name', 'manage_department'))
            ->get()
            ->each(fn (Role $role) => $role->givePermissionTo('upload_gallery'));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Permission::findByName('upload_gallery', 'web')->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
