<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class MemberPhoto
{
    private const SIZE = 600;

    private const TALLEST = 800;

    /** The tallest shape kept, as height divided by width. */
    private const NARROWEST_SHAPE = 5 / 3;

    /**
     * Size and re-encode an upload on the private disk, which also strips anything
     * embedded in the original file. A passport shape is kept. Anything else that
     * skipped the cropper is squared from the centre.
     */
    public static function store(UploadedFile $file, ?string $replaces = null): string
    {
        $image = ImageManager::usingDriver(Driver::class)
            ->decodePath($file->getRealPath())
            ->orient();

        $passport = $image->width() <= $image->height()
            && $image->height() / $image->width() <= self::NARROWEST_SHAPE;

        $encoded = ($passport ? $image->scaleDown(self::SIZE, self::TALLEST) : $image->cover(self::SIZE, self::SIZE))
            ->encodeUsingMediaType('image/jpeg', quality: 85);

        $path = 'photos/'.Str::uuid().'.jpg';

        Storage::disk('local')->put($path, (string) $encoded);

        if ($replaces) {
            Storage::disk('local')->delete($replaces);
        }

        return $path;
    }
}
