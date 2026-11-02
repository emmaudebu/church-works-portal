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
            $table->string('about_label')->nullable()->after('about');
            $table->string('about_title')->nullable()->after('about_label');
            $table->string('about_accent')->nullable()->after('about_title');
            $table->string('about_image')->nullable()->after('about_accent');
            $table->string('about_small_image')->nullable()->after('about_image');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->dropColumn(['about_label', 'about_title', 'about_accent', 'about_image', 'about_small_image']);
        });
    }
};
