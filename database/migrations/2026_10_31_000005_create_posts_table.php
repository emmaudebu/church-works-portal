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
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            // Null means church-wide: only a super admin can post to everyone.
            $table->foreignId('department_id')->nullable()->constrained()->cascadeOnDelete();
            $table->enum('type', ['news', 'event', 'announcement']);
            $table->string('title');
            $table->mediumText('body');
            $table->string('image')->nullable();
            $table->dateTime('event_date')->nullable()->index();
            $table->string('venue')->nullable();
            $table->dateTime('published_at')->nullable()->index();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
