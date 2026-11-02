<?php

use App\Support\Settings;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Names changed by an admin are left as they are.
     */
    public function up(): void
    {
        DB::table('departments')->where('slug', 'technical-unit')->update(['slug' => 'technical-department']);
        DB::table('departments')->where('name', 'Technical Unit')->update(['name' => 'Technical Department']);
        DB::table('departments')
            ->where('about', 'like', 'The Technical Unit serves%')
            ->update(['about' => DB::raw("REPLACE(about, 'The Technical Unit', 'The Technical Department')")]);

        if (Settings::get('church_name') === 'Covenant Workforce') {
            Settings::set('church_name', Settings::DEFAULT_CHURCH_NAME);
        }
    }

    public function down(): void
    {
        DB::table('departments')->where('slug', 'technical-department')->update(['slug' => 'technical-unit']);
        DB::table('departments')->where('name', 'Technical Department')->update(['name' => 'Technical Unit']);
        DB::table('departments')
            ->where('about', 'like', 'The Technical Department serves%')
            ->update(['about' => DB::raw("REPLACE(about, 'The Technical Department', 'The Technical Unit')")]);
    }
};
