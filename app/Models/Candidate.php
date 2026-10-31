<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['position_id', 'user_id', 'manifesto', 'photo'])]
class Candidate extends Model
{
    /**
     * @return BelongsTo<Position, $this>
     */
    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function photoUrl(): ?string
    {
        $path = $this->photo ?? $this->user->photo;

        return $path ? route('candidates.photo', ['candidate' => $this->id, 'v' => substr(md5($path), 0, 8)]) : null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toBallot(): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->user->full_name,
            'unit' => $this->user->unit,
            'manifesto' => $this->manifesto,
            'photo_url' => $this->photoUrl(),
        ];
    }
}
