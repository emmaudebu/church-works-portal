<?php

namespace App\Console\Commands;

use App\Models\Media;
use App\Support\MediaLibrary;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('media:import')]
#[Description('Add pictures already uploaded to the site to the media library')]
class ImportMedia extends Command
{
    /**
     * Execute the console command. Running it again adds only what is missing.
     */
    public function handle(): int
    {
        $before = Media::count();

        MediaLibrary::importExisting();

        $this->info((Media::count() - $before).' pictures added to the media library.');

        return self::SUCCESS;
    }
}
