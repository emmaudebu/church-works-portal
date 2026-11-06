<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['department_id', 'service_id', 'event_name', 'taken_on', 'image', 'caption', 'uploaded_by'])]
class DepartmentImage extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'taken_on' => 'date',
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
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * The service the pictures were taken at. A removed service keeps its pictures.
     *
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class)->withTrashed();
    }

    /**
     * One row per service or event that has pictures, newest first, with its
     * picture count. Pictures from before services were picked come last.
     *
     * @param  Builder<DepartmentImage>  $query
     */
    public function scopeOccasions(Builder $query): void
    {
        $query->select('department_id', 'service_id', 'event_name', 'taken_on')
            ->selectRaw('count(*) as pictures_count, max(id) as latest_id')
            ->groupBy('department_id', 'service_id', 'event_name', 'taken_on')
            ->orderByRaw('taken_on is null')
            ->orderByDesc('taken_on')
            ->orderByDesc('latest_id');
    }

    /**
     * Pictures taken at the same service or event as the given one.
     *
     * @param  Builder<DepartmentImage>  $query
     */
    public function scopeSameOccasionAs(Builder $query, DepartmentImage $image): void
    {
        $query->where('department_id', $image->department_id);

        foreach (['service_id', 'event_name', 'taken_on'] as $column) {
            $value = $image->getRawOriginal($column);

            $value === null ? $query->whereNull($column) : $query->where($column, $value);
        }
    }

    /**
     * The service or event the picture belongs to, for grouping.
     *
     * @return array{key: string, title: string, date_label: string|null, is_service: bool}
     */
    public function occasion(): array
    {
        $title = $this->service?->title ?? $this->event_name;

        return [
            'key' => implode('|', [$this->service_id, $this->event_name, $this->taken_on?->toDateString()]),
            'title' => $title ?? 'More moments',
            'date_label' => $this->taken_on?->format('D j M Y'),
            'is_service' => $this->service_id !== null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toCard(): array
    {
        return [
            'id' => $this->id,
            'caption' => $this->caption,
            'url' => Storage::disk('public')->url($this->image),
        ];
    }
}
