<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per month is kept so monthly reports stay exact; the batch ties
     * together months paid for in a single transaction.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('batch', 40)->nullable()->index()->after('reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('batch');
        });
    }
};
