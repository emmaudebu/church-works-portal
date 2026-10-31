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
            ['Technical Unit', 'technical-unit', 'monitor-speaker', 'Sound, media, lighting', 'active', 'The Technical Unit serves behind the scenes so every word is heard and every service is seen. Our teams look after sound, media, lighting and projection for each gathering.'],
            ['Choir', 'choir', 'music', 'Praise and worship', 'coming_soon', 'The Choir leads the congregation in praise and worship at every service.'],
            ['Ushering', 'ushering', 'hand-heart', 'Welcome and order', 'coming_soon', 'Ushers welcome everyone who comes through our doors and help each service run in order.'],
        ] as [$name, $slug, $icon, $description, $status, $about]) {
            Department::firstOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'icon' => $icon, 'description' => $description, 'status' => $status],
            );

            Department::where('slug', $slug)->whereNull('about')->update(['about' => $about]);
        }
    }
}
