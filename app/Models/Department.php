<?php

namespace App\Models;

use Database\Factories\DepartmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

#[Fillable(['name', 'slug', 'icon', 'description', 'image', 'about', 'about_label', 'about_title', 'about_accent', 'about_image', 'about_small_image', 'bank_name', 'account_number', 'account_name', 'status'])]
class Department extends Model
{
    /** @use HasFactory<DepartmentFactory> */
    use HasFactory;

    public const ICONS = [
        'building', 'monitor-speaker', 'music', 'hand-heart', 'mic', 'camera', 'book-open',
        'baby', 'shield', 'sparkles', 'heart-handshake', 'car', 'utensils', 'flower',
    ];

    /**
     * Pictures for departments that have not uploaded their own.
     */
    private const FALLBACK_IMAGES = ['gathering', 'stage', 'praise', 'auditorium', 'worship'];

    /**
     * The only active department, or null once there are several.
     */
    public static function single(): ?self
    {
        $active = self::where('status', 'active')->limit(2)->get();

        return $active->count() === 1 ? $active->first() : null;
    }

    public function imageUrl(): string
    {
        return $this->image
            ? Storage::disk('public')->url($this->image)
            : '/images/site/'.self::FALLBACK_IMAGES[$this->id % count(self::FALLBACK_IMAGES)].'.jpg';
    }

    /**
     * The picture across the top of the public page. Without one of its own a
     * department uses its oldest gallery picture, which the About section does
     * not already show.
     */
    public function bannerUrl(): string
    {
        $galleryImage = $this->image ? null : $this->images()->reorder()->oldest('id')->first();

        return $galleryImage
            ? $galleryImage->toCard()['url']
            : $this->imageUrl();
    }

    /**
     * The fields a card or page needs.
     *
     * @return array<string, mixed>
     */
    public function toCard(): array
    {
        return [
            ...$this->only(['id', 'name', 'slug', 'icon', 'description', 'about', 'about_label', 'about_title', 'about_accent', 'status']),
            'members_count' => (int) ($this->members_count ?? 0),
            'image_url' => $this->imageUrl(),
            'about_image_url' => $this->about_image ? Storage::disk('public')->url($this->about_image) : null,
            'about_small_image_url' => $this->about_small_image ? Storage::disk('public')->url($this->about_small_image) : null,
        ];
    }

    public function hasBankAccount(): bool
    {
        return filled($this->bank_name) && filled($this->account_number) && filled($this->account_name);
    }

    /**
     * @return array<string, string|null>
     */
    public function bankAccount(): array
    {
        return $this->only(['bank_name', 'account_number', 'account_name']);
    }

    /**
     * Whether deleting this department would affect people or their records.
     */
    public function inUse(): bool
    {
        return $this->users()->exists()
            || Attendance::whereHas('service', fn (Builder $services) => $services->where('department_id', $this->id))->exists();
    }

    /**
     * @return HasMany<Unit, $this>
     */
    public function units(): HasMany
    {
        return $this->hasMany(Unit::class)->orderBy('name');
    }

    /**
     * @return HasMany<DepartmentImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(DepartmentImage::class)->latest('id');
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Active departments first, then alphabetical, each with its active member count.
     *
     * @param  Builder<Department>  $query
     */
    public function scopeForDisplay(Builder $query): void
    {
        $query->withCount(['users as members_count' => fn (Builder $users) => $users->where('status', 'active')])
            ->orderByRaw("status = 'active' desc")
            ->orderBy('name');
    }
}
