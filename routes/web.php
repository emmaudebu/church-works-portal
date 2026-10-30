<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Welcome'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect()->route(request()->user()->isAdmin() ? 'admin.dashboard' : 'member.home');
    })->name('dashboard');

    Route::get('/home', fn () => Inertia::render('Member/Home'))->name('member.home');

    // Placeholders so navigation works; each is replaced by its build step.
    foreach (['events' => 'Events', 'my-qr' => 'My QR', 'elections' => 'Elections'] as $uri => $title) {
        Route::get("/{$uri}", fn () => Inertia::render('Member/Placeholder', ['title' => $title]))
            ->name('member.'.$uri);
    }

    Route::prefix('admin')->name('admin.')->middleware('role:super_admin|dept_admin')->group(function () {
        Route::get('/', fn () => Inertia::render('Admin/Dashboard'))->name('dashboard');

        foreach ([
            'members' => 'Members', 'scanner' => 'Attendance Scanner', 'services' => 'Services',
            'reports' => 'Attendance Reports', 'posts' => 'Posts', 'elections' => 'Elections',
        ] as $uri => $title) {
            Route::get("/{$uri}", fn () => Inertia::render('Admin/Placeholder', ['title' => $title]))->name($uri);
        }

        Route::middleware('role:super_admin')->group(function () {
            foreach (['departments' => 'Departments', 'settings' => 'Settings'] as $uri => $title) {
                Route::get("/{$uri}", fn () => Inertia::render('Admin/Placeholder', ['title' => $title]))->name($uri);
            }
        });
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
});

require __DIR__.'/auth.php';
