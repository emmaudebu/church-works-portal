<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            // Which recurring service from Settings this came from; null for one-offs.
            $table->string('recurring_key', 40)->nullable()->after('type');
            $table->unique(['department_id', 'recurring_key', 'date']);
        });

        DB::table('services')->whereIn('type', ['sunday', 'wednesday'])->update(['recurring_key' => DB::raw('type')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropUnique(['department_id', 'recurring_key', 'date']);
            $table->dropColumn('recurring_key');
        });
    }
};
