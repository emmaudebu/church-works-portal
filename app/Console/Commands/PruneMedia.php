<?php

namespace App\Console\Commands;

use App\Support\MediaLibrary;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('media:prune')]
#[Description('Delete gallery photos three months after upload, and pictures unused for three months')]
class PruneMedia extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info(MediaLibrary::pruneUnused().' unused pictures deleted.');

        return self::SUCCESS;
    }
}
