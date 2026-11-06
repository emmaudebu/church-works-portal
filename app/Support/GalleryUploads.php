<?php

namespace App\Support;

use App\Models\Department;
use App\Models\DepartmentImage;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * Adding pictures to a department's gallery, each tied to the service or event
 * it was taken at. Used by the department's admins and by gallery uploaders.
 */
class GalleryUploads
{
    public const MAX_UPLOADS = 12;

    public const PERMISSION = 'upload_gallery';

    /**
     * The department's services that have started, which pictures can be from.
     *
     * @return Collection<int, array{id: int, label: string}>
     */
    public static function services(Department $department): Collection
    {
        return Service::where('department_id', $department->id)
            ->where('opens_at', '<=', now())
            ->latest('date')
            ->latest('opens_at')
            ->limit(40)
            ->get()
            ->map(fn (Service $service) => [
                'id' => $service->id,
                'label' => $service->title.' · '.$service->date->format('D j M Y'),
            ])
            ->toBase();
    }

    /**
     * Events that already have pictures, so more can be added to them.
     *
     * @return Collection<int, array{name: string, date: string, label: string}>
     */
    public static function events(Department $department): Collection
    {
        return $department->images()
            ->reorder()
            ->whereNotNull('event_name')
            ->select('event_name', 'taken_on')
            ->distinct()
            ->orderByDesc('taken_on')
            ->get()
            ->map(fn (DepartmentImage $image) => [
                'name' => $image->event_name,
                'date' => $image->taken_on->toDateString(),
                'label' => $image->event_name.' · '.$image->taken_on->format('D j M Y'),
            ])
            ->toBase();
    }

    /**
     * Validate and save uploaded pictures.
     */
    public static function store(Request $request, Department $department): void
    {
        $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:'.self::MAX_UPLOADS],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ], ['images.max' => 'Upload up to '.self::MAX_UPLOADS.' pictures at a time.']);

        $occasion = self::validateOccasion($request, $department);

        foreach ($request->file('images') as $file) {
            $department->images()->create([
                ...$occasion,
                'image' => PostImage::store($file, directory: 'gallery'),
                'uploaded_by' => $request->user()->id,
            ]);
        }
    }

    /**
     * The service the pictures were taken at, or the name and date of an event
     * that was not a service.
     *
     * @return array{service_id: int|null, event_name: string|null, taken_on: string}
     */
    public static function validateOccasion(Request $request, Department $department): array
    {
        $validated = $request->validate([
            'service_id' => [
                'nullable', 'required_without:event_name', 'integer',
                Rule::exists('services', 'id')
                    ->where('department_id', $department->id)
                    ->where(fn ($services) => $services->where('opens_at', '<=', now())->whereNull('deleted_at')),
            ],
            'event_name' => ['nullable', 'required_without:service_id', 'string', 'max:100'],
            'event_date' => ['nullable', 'required_with:event_name', 'date', 'before_or_equal:today'],
        ], [
            'service_id.required_without' => 'Choose the service these pictures are from, or type the event.',
            'event_name.required_without' => 'Choose the service these pictures are from, or type the event.',
            'service_id.exists' => 'Choose a service that has already taken place.',
            'event_date.required_with' => 'Enter the date of the event.',
            'event_date.before_or_equal' => 'The event date can not be in the future.',
        ]);

        if ($validated['service_id'] ?? null) {
            return [
                'service_id' => $validated['service_id'],
                'event_name' => null,
                'taken_on' => Service::findOrFail($validated['service_id'])->date->toDateString(),
            ];
        }

        return [
            'service_id' => null,
            'event_name' => trim($validated['event_name']),
            'taken_on' => Carbon::parse($validated['event_date'])->toDateString(),
        ];
    }
}
