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
        Schema::table('department_images', function (Blueprint $table) {
            $table->foreignId('service_id')->nullable()->after('department_id')->constrained()->nullOnDelete();
            $table->string('event_name', 100)->nullable()->after('service_id');
            $table->date('taken_on')->nullable()->after('event_name');

            $table->index(['department_id', 'taken_on']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('department_images', function (Blueprint $table) {
            $table->dropIndex(['department_id', 'taken_on']);
            $table->dropConstrainedForeignId('service_id');
            $table->dropColumn(['event_name', 'taken_on']);
        });
    }
};
