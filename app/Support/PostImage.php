<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class PostImage
{
    private const MAX_WIDTH = 1600;

    /**
     * Resize and re-encode a cover image on the public disk.
     */
    public static function store(UploadedFile $file, ?string $replaces = null): string
    {
        $encoded = ImageManager::usingDriver(Driver::class)
            ->decodePath($file->getRealPath())
            ->orient()
            ->scaleDown(width: self::MAX_WIDTH)
            ->encodeUsingMediaType('image/jpeg', quality: 82);

        $path = 'posts/'.Str::uuid().'.jpg';

        Storage::disk('public')->put($path, (string) $encoded);

        if ($replaces) {
            Storage::disk('public')->delete($replaces);
        }

        return $path;
    }
}
