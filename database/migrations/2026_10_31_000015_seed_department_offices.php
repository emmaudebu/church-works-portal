<?php

use Database\Seeders\RoleSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Create the offices and permissions on every installation.
     */
    public function up(): void
    {
        (new RoleSeeder)->run();
    }
};
