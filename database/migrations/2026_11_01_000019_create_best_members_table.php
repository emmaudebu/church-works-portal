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
        Schema::create('best_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('period', 7);
            $table->decimal('score', 4, 1);
            $table->unsignedTinyInteger('attendance_rate');
            $table->unsignedTinyInteger('punctuality');
            $table->unsignedTinyInteger('days_attended');
            $table->unsignedTinyInteger('days_held');
            $table->timestamps();

            $table->unique(['department_id', 'period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('best_members');
    }
};
