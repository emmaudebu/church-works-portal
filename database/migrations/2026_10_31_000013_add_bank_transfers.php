<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->string('bank_name')->nullable()->after('about');
            $table->string('account_number', 20)->nullable()->after('bank_name');
            $table->string('account_name')->nullable()->after('account_number');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->enum('status', ['pending', 'success', 'failed', 'under_review', 'rejected'])->default('pending')->change();
            $table->enum('method', ['paystack', 'cash', 'transfer'])->change();
            $table->string('receipt')->nullable()->after('method');
            $table->string('rejection_reason')->nullable()->after('receipt');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['receipt', 'rejection_reason']);
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'account_number', 'account_name']);
        });
    }
};
