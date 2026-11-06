<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations. A picture nothing shows is deleted once it has been
     * unused for long enough, counted from this date.
     */
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->timestamp('unused_since')->nullable()->after('uploaded_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn('unused_since');
        });
    }
};
