<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Seed the launch departments. Existing statuses are left alone so reseeding
     * never undoes a switch made in the admin screen.
     */
    public function run(): void
    {
        foreach ([
            ['Technical Unit', 'technical-unit', 'monitor-speaker', 'Sound, media, lighting', 'active'],
            ['Choir', 'choir', 'music', 'Praise and worship', 'coming_soon'],
            ['Ushering', 'ushering', 'hand-heart', 'Welcome and order', 'coming_soon'],
        ] as [$name, $slug, $icon, $description, $status]) {
            Department::firstOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'icon' => $icon, 'description' => $description, 'status' => $status],
            );
        }
    }
}
