<?php

namespace App\Models;

use Database\Factories\MediaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * A picture in the media library, which any section of the site can reuse.
 */
#[Fillable(['path', 'name', 'width', 'height', 'size', 'uploaded_by', 'unused_since'])]
class Media extends Model
{
    /** @use HasFactory<MediaFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['unused_since' => 'datetime'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function url(): string
    {
        return Storage::disk('public')->url($this->path);
    }

    /**
     * @return array{id: int, url: string, name: string, width: int|null, height: int|null}
     */
    public function toCard(): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url(),
            'name' => $this->name,
            'width' => $this->width,
            'height' => $this->height,
        ];
    }
}
