<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        $password = config('covenant.super_admin.password');

        if (app()->isProduction() && blank($password)) {
            throw new RuntimeException('Set SUPER_ADMIN_PASSWORD before seeding production.');
        }

        User::firstOrCreate(
            ['email' => config('covenant.super_admin.email')],
            ['full_name' => 'Super Admin', 'status' => 'active', 'password' => $password ?: 'password'],
        )->assignRole('super_admin');

        if (app()->isProduction()) {
            return;
        }

        User::firstOrCreate(
            ['email' => 'deptadmin@covenantworkforce.test'],
            ['full_name' => 'Grace Department', 'phone' => '+2348000000001', 'status' => 'active', 'password' => 'password'],
        )->assignRole('dept_admin');

        User::firstOrCreate(
            ['email' => 'member@covenantworkforce.test'],
            ['full_name' => 'Daniel Member', 'phone' => '+2348000000002', 'status' => 'active', 'password' => 'password'],
        )->assignRole('member');
    }
}
