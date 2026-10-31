<?php

use App\Support\ServiceGenerator;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('services:generate', function () {
    ServiceGenerator::generate();

    $this->info('Recurring services are up to date.');
})->purpose('Create the upcoming Sunday and Wednesday services');

Schedule::command('services:generate')->daily();

// Sends queued push notifications on hosts that can't keep a worker running.
Schedule::command('queue:work --stop-when-empty --max-time=50')->everyMinute()->withoutOverlapping();
