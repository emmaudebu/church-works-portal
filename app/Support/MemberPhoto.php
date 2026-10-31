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

    /**
     * Square and re-encode an upload on the private disk, which also strips
     * anything embedded in the original file.
     */
    public static function store(UploadedFile $file, ?string $replaces = null): string
    {
        $encoded = ImageManager::usingDriver(Driver::class)
            ->decodePath($file->getRealPath())
            ->orient()
            ->cover(self::SIZE, self::SIZE)
            ->encodeUsingMediaType('image/jpeg', quality: 85);

        $path = 'photos/'.Str::uuid().'.jpg';

        Storage::disk('local')->put($path, (string) $encoded);

        if ($replaces) {
            Storage::disk('local')->delete($replaces);
        }

        return $path;
    }
}
