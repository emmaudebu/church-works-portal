<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

/**
 * Personal documents such as certificates and receipts, on the private disk.
 */
class PrivateDocument
{
    private const MAX_IMAGE_WIDTH = 2000;

    /**
     * Pictures are re-encoded, which also strips anything hidden inside them.
     */
    public static function store(UploadedFile $file, string $directory, ?string $replaces = null): string
    {
        $isPdf = $file->getMimeType() === 'application/pdf';
        $path = $directory.'/'.Str::uuid().($isPdf ? '.pdf' : '.jpg');

        $contents = $isPdf
            ? $file->getContent()
            : (string) ImageManager::usingDriver(Driver::class)
                ->decodePath($file->getRealPath())
                ->orient()
                ->scaleDown(width: self::MAX_IMAGE_WIDTH)
                ->encodeUsingMediaType('image/jpeg', quality: 85);

        Storage::disk('local')->put($path, $contents);

        if ($replaces) {
            Storage::disk('local')->delete($replaces);
        }

        return $path;
    }
}
