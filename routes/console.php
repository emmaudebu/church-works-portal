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
