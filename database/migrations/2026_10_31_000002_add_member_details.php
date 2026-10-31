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
        Schema::table('users', function (Blueprint $table) {
            $table->string('member_id', 30)->nullable()->unique()->after('department_id');
            $table->enum('gender', ['male', 'female'])->nullable()->after('full_name');
            $table->date('date_of_birth')->nullable()->after('gender');
            $table->string('address')->nullable()->after('email_verified_at');
            $table->string('photo')->nullable()->after('address');
            $table->string('unit')->nullable()->index()->after('photo');
            $table->date('date_joined')->nullable()->after('unit');
            $table->boolean('foundation_class_done')->default(false)->after('date_joined');
            $table->boolean('wofbi_done')->default(false)->after('foundation_class_done');
            $table->boolean('must_change_password')->default(false)->after('password');
        });

        Schema::create('member_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('next_of_kin_name')->nullable();
            $table->string('next_of_kin_relationship')->nullable();
            $table->string('next_of_kin_phone', 20)->nullable();
            $table->string('occupation')->nullable();
            $table->json('technical_skills')->nullable();
            $table->enum('marital_status', ['single', 'married', 'widowed', 'divorced'])->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('suspension_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('action', ['suspended', 'reactivated']);
            $table->string('reason')->nullable();
            $table->foreignId('by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('suspension_logs');
        Schema::dropIfExists('member_profiles');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'member_id', 'gender', 'date_of_birth', 'address', 'photo', 'unit',
                'date_joined', 'foundation_class_done', 'wofbi_done', 'must_change_password',
            ]);
        });
    }
};
