<?php

namespace App\Support;

use App\Models\Department;
use App\Models\DepartmentImage;
use App\Models\Media;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
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
     * Where a picture is shown on the site.
     *
     * @return array<int, string>
     */
    public static function usages(string $path): array
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

        DepartmentImage::where('image', $path)->with('department:id,name')->get()
            ->each(function (DepartmentImage $image) use (&$places) {
                $places[] = "{$image->department->name} gallery";
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
