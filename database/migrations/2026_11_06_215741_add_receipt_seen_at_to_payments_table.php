<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations. A member is asked to download the receipt of each
     * payment until they do; payments made before receipts existed are not.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->timestamp('receipt_seen_at')->nullable()->after('paid_at');
        });

        DB::table('payments')->where('status', 'success')->update(['receipt_seen_at' => now()]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('receipt_seen_at');
        });
    }
};
