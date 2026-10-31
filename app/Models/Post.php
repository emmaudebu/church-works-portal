<?php

namespace App\Models;

use App\Models\Concerns\ManagedByDepartment;
use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

#[Fillable(['department_id', 'type', 'title', 'body', 'image', 'event_date', 'venue', 'published_at', 'author_id'])]
class Post extends Model
{
    /** @use HasFactory<PostFactory> */
    use HasFactory, ManagedByDepartment;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'event_date' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * @param  Builder<Post>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    /**
     * News and events anyone may read. Announcements stay inside the workforce.
     *
     * @param  Builder<Post>  $query
     */
    public function scopePublicFacing(Builder $query): void
    {
        $query->published()->whereIn('type', ['news', 'event']);
    }

    /**
     * Published posts a member may read: their department's and church-wide ones.
     *
     * @param  Builder<Post>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $query->published()->where(fn (Builder $query) => $query
            ->whereNull('department_id')
            ->orWhere('department_id', $user->department_id));
    }

    public function isPublished(): bool
    {
        return $this->published_at !== null && $this->published_at->isPast();
    }

    public function isVisibleTo(?User $user): bool
    {
        if (! $this->isPublished()) {
            return false;
        }

        if ($user && $this->department_id !== null && $this->department_id !== $user->department_id
            && ! $user->hasRole('super_admin')) {
            return $this->type !== 'announcement';
        }

        return $user !== null || $this->type !== 'announcement';
    }

    /**
     * Pictures for posts without a cover, varied so a page never looks repetitive.
     */
    private const FALLBACK_IMAGES = [
        'news' => ['congregation', 'gathering', 'auditorium'],
        'event' => ['stage', 'worship', 'praise'],
        'announcement' => ['surrender', 'sunrise', 'globe', 'cross'],
    ];

    public function imageUrl(): string
    {
        if ($this->image) {
            return Storage::disk('public')->url($this->image);
        }

        $images = self::FALLBACK_IMAGES[$this->type];

        return '/images/site/'.$images[$this->id % count($images)].'.jpg';
    }

    /**
     * The fields a card needs.
     *
     * @return array<string, mixed>
     */
    public function toCard(): array
    {
        $date = $this->event_date ?? $this->published_at ?? $this->created_at;

        return [
            ...$this->only(['id', 'type', 'title', 'venue']),
            'excerpt' => Str::limit(html_entity_decode(strip_tags(str_replace('</', ' </', $this->body))), 120),
            'image_url' => $this->imageUrl(),
            'day' => $date->format('j'),
            'month' => $date->format('M'),
            'date' => $date->toDateString(),
            'date_label' => $this->event_date?->format('l j F Y, g:i A') ?? $date->format('j F Y'),
        ];
    }
}
