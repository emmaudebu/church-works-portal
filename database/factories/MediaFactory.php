<?php

namespace Database\Factories;

use App\Models\Media;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Media>
 */
class MediaFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'path' => 'posts/'.fake()->unique()->uuid().'.jpg',
            'name' => fake()->word().'.jpg',
            'width' => 1600,
            'height' => 900,
            'size' => 120000,
        ];
    }
}
