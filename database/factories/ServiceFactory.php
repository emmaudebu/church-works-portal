<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    /**
     * Define the model's default state: open right now.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'department_id' => Department::factory(),
            'type' => 'sunday',
            'title' => 'Sunday Service',
            'date' => today(),
            'opens_at' => now()->subHour(),
            'closes_at' => now()->addHour(),
            'is_open' => true,
        ];
    }

    public function finished(int $daysAgo = 7): static
    {
        return $this->state(fn (array $attributes) => [
            'date' => today()->subDays($daysAgo),
            'opens_at' => now()->subDays($daysAgo)->subHour(),
            'closes_at' => now()->subDays($daysAgo)->addHour(),
        ]);
    }
}
