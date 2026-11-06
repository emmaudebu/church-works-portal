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
     * Resize and re-encode a picture on the public disk and add it to the
     * media library.
     */
    public static function store(UploadedFile $file, string $directory = 'posts'): string
    {
        $encoded = ImageManager::usingDriver(Driver::class)
            ->decodePath($file->getRealPath())
            ->orient()
            ->scaleDown(width: self::MAX_WIDTH)
            ->encodeUsingMediaType('image/jpeg', quality: 82);

        $path = $directory.'/'.Str::uuid().'.jpg';

        Storage::disk('public')->put($path, (string) $encoded);

        MediaLibrary::register($path, $file);

        return $path;
    }
}
