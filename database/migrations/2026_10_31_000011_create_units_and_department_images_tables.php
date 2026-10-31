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
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->timestamps();

            $table->unique(['department_id', 'name']);
        });

        Schema::create('department_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->string('image');
            $table->string('caption')->nullable();
            $table->timestamps();
        });

        // Keep the units members already typed in.
        DB::table('users')
            ->whereNotNull('department_id')
            ->whereNotNull('unit')
            ->select('department_id', 'unit')
            ->distinct()
            ->get()
            ->each(fn (object $row) => DB::table('units')->insertOrIgnore([
                'department_id' => $row->department_id,
                'name' => $row->unit,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('department_images');
        Schema::dropIfExists('units');
    }
};
