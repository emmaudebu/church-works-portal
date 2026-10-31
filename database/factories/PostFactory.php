<?php

namespace Database\Factories;

use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => 'news',
            'title' => fake()->sentence(4),
            'body' => '<p>'.fake()->paragraph().'</p>',
            'published_at' => now()->subHour(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => ['published_at' => null]);
    }

    public function event(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'event',
            'event_date' => now()->addWeek(),
            'venue' => 'Main Auditorium',
        ]);
    }

    public function announcement(): static
    {
        return $this->state(fn (array $attributes) => ['type' => 'announcement']);
    }
}
