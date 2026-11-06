<?php

namespace App\Support;

use App\Models\Department;
use App\Models\DepartmentImage;
use App\Models\Media;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Every picture uploaded for the public site lands in the media library, so it
 * can be picked again for any section instead of being uploaded twice. A
 * picture stays in the library when a section stops using it, and can only be
 * deleted from the library once nothing uses it.
 */
class MediaLibrary
{
    /** The public folders whose pictures belong in the library. */
    private const FOLDERS = ['posts', 'gallery', 'popups'];

    /** How long a picture nothing shows is kept before it is deleted. */
    public const KEEP_UNUSED_MONTHS = 3;

    /**
     * Whether someone edits a part of the site that shows pictures.
     */
    public static function canUse(User $user): bool
    {
        return $user->canDo('manage_department') || $user->canDo('manage_posts');
    }

    /**
     * Add a stored picture to the library.
     */
    public static function register(string $path, ?UploadedFile $file = null, ?int $uploadedBy = null): Media
    {
        $disk = Storage::disk('public');
        $dimensions = @getimagesize($disk->path($path)) ?: [null, null];

        return Media::firstOrCreate(['path' => $path], [
            'name' => mb_substr($file?->getClientOriginalName() ?: basename($path), 0, 255),
            'width' => $dimensions[0],
            'height' => $dimensions[1],
            'size' => $disk->size($path),
            'uploaded_by' => $uploadedBy ?? auth()->id(),
        ]);
    }

    /**
     * Validation for picking a library picture in place of uploading one.
     *
     * @return array<string, array<int, string>>
     */
    public static function rules(string ...$keys): array
    {
        return collect($keys)
            ->mapWithKeys(fn (string $key) => ["{$key}_media" => ['nullable', 'integer', 'exists:media,id']])
            ->all();
    }

    /**
     * The picture a form field ends up with: a new upload, one picked from the
     * library (sent as "<field>_media"), or the one it already had.
     */
    public static function resolve(Request $request, string $key, ?string $current = null): ?string
    {
        if ($request->hasFile($key)) {
            return PostImage::store($request->file($key));
        }

        if ($id = $request->input("{$key}_media")) {
            return Media::findOrFail($id)->path;
        }

        return $current;
    }

    /**
     * Whether a form field was given a new picture, uploaded or picked.
     */
    public static function chosen(Request $request, string $key): bool
    {
        return $request->hasFile($key) || $request->filled("{$key}_media");
    }

    /**
     * Where a picture is shown on the site, galleries included.
     *
     * @return array<int, string>
     */
    public static function usages(string $path): array
    {
        return [...self::sectionUsages($path), ...self::galleryUsages($path)];
    }

    /**
     * The galleries a picture is in.
     *
     * @return array<int, string>
     */
    public static function galleryUsages(string $path): array
    {
        return DepartmentImage::where('image', $path)->with('department:id,name')->get()
            ->map(fn (DepartmentImage $image) => "{$image->department->name} gallery")
            ->all();
    }

    /**
     * The sections of the site that show a picture, galleries aside.
     *
     * @return array<int, string>
     */
    public static function sectionUsages(string $path): array
    {
        $home = Settings::home();
        $places = [];

        foreach ($home['slides'] as $index => $slide) {
            if ($slide['image'] === $path) {
                $places[] = 'Homepage slide '.($index + 1);
            }
        }

        if ($home['welcome']['image'] === $path) {
            $places[] = 'Homepage welcome picture';
        }

        if ($home['welcome']['small_image'] === $path) {
            $places[] = 'Homepage welcome round picture';
        }

        if (($home['units']['image'] ?? null) === $path) {
            $places[] = 'Homepage units background';
        }

        foreach ($home['join']['steps'] as $index => $step) {
            if ($step['image'] === $path) {
                $places[] = 'Homepage join step '.($index + 1);
            }
        }

        if (Settings::popup()['image'] === $path) {
            $places[] = 'Visitor pop-up';
        }

        Department::where(fn ($departments) => $departments->where('image', $path)
            ->orWhere('about_image', $path)
            ->orWhere('about_small_image', $path))
            ->pluck('name')
            ->each(function (string $name) use (&$places) {
                $places[] = "{$name} page";
            });

        Post::where('image', $path)->pluck('title')->each(function (string $title) use (&$places) {
            $places[] = "Post: {$title}";
        });

        return $places;
    }

    /**
     * Delete a picture and its library entry when nothing shows it any more,
     * as when a gallery picture is removed.
     */
    public static function discard(string $path): void
    {
        if (self::usages($path) !== []) {
            return;
        }

        Storage::disk('public')->delete($path);
        Media::where('path', $path)->delete();
    }

    /**
     * Clear away old pictures. Gallery photos leave the gallery three months
     * after they were uploaded, and their file goes too unless another
     * section shows it. Any other picture is deleted once nothing has shown
     * it for three months: each run notes when a picture fell out of use,
     * and forgets it again if it is used once more.
     *
     * @return int How many pictures were deleted.
     */
    public static function pruneUnused(): int
    {
        $cutoff = now()->subMonths(self::KEEP_UNUSED_MONTHS);
        $before = Media::count();

        DepartmentImage::where('created_at', '<=', $cutoff)->lazyById()->each(function (DepartmentImage $image) {
            $image->delete();
            self::discard($image->image);
        });

        $deleted = $before - Media::count();

        Media::query()->lazyById()->each(function (Media $media) use ($cutoff, &$deleted) {
            if (self::usages($media->path) !== []) {
                if ($media->unused_since) {
                    $media->update(['unused_since' => null]);
                }

                return;
            }

            if (! $media->unused_since) {
                $media->update(['unused_since' => now()]);

                return;
            }

            if ($media->unused_since->lte($cutoff)) {
                Storage::disk('public')->delete($media->path);
                $media->delete();
                $deleted++;
            }
        });

        return $deleted;
    }

    /**
     * When a picture will be deleted: three months after it went into a
     * gallery, or after it fell out of use. Null while a section shows it.
     */
    public static function deletesOn(Media $media): ?string
    {
        if (self::sectionUsages($media->path) !== []) {
            return null;
        }

        $addedToGallery = DepartmentImage::where('image', $media->path)->min('created_at');
        $from = $addedToGallery ? Carbon::parse($addedToGallery) : ($media->unused_since ?? now());

        return $from->addMonths(self::KEEP_UNUSED_MONTHS)->format('j F Y');
    }

    /**
     * Put the pictures already on the site into the library.
     */
    public static function importExisting(): void
    {
        $disk = Storage::disk('public');
        $uploaders = DepartmentImage::whereNotNull('uploaded_by')->pluck('uploaded_by', 'image');

        collect(self::FOLDERS)
            ->flatMap(fn (string $folder) => $disk->files($folder))
            ->filter(fn (string $path) => preg_match('/\.(jpe?g|png|webp)$/i', $path))
            ->each(fn (string $path) => self::register($path, uploadedBy: $uploaders->get($path)));
    }
}
