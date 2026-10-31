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
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['sunday', 'wednesday', 'special']);
            $table->string('title');
            $table->date('date');
            $table->dateTime('opens_at');
            $table->dateTime('closes_at');
            $table->boolean('is_open')->default(true);
            $table->timestamps();

            $table->index(['department_id', 'date']);
        });

        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('method', ['qr', 'manual', 'fingerprint']);
            $table->dateTime('checked_in_at');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();

            $table->unique(['service_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance');
        Schema::dropIfExists('services');
    }
};
