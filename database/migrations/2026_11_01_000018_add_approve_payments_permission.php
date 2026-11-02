<?php

use App\Support\Offices;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Give receipt approval its own permission, for the Financial Secretary and Head.
     */
    public function up(): void
    {
        Permission::findOrCreate('approve_payments', 'web');

        foreach ([Offices::HEAD, 'financial_secretary'] as $office) {
            Role::findOrCreate($office, 'web')->givePermissionTo('approve_payments');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Permission::findByName('approve_payments', 'web')->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
