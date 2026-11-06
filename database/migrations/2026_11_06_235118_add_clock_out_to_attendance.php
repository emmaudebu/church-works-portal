<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations. A service gets the time it ends, after which members
     * are scanned out at the exit, and each attendance the time they left.
     * Services without an end time end when check-in closes.
     */
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dateTime('ends_at')->nullable()->after('closes_at');
        });

        Schema::table('attendance', function (Blueprint $table) {
            $table->dateTime('checked_out_at')->nullable()->after('checked_in_at');
            $table->foreignId('checked_out_by')->nullable()->after('recorded_by')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->dropConstrainedForeignId('checked_out_by');
            $table->dropColumn('checked_out_at');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('ends_at');
        });
    }
};
