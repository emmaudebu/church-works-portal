<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\MemberController;
use App\Http\Controllers\Admin\MemberStatusController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\ScannerController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QrCodeController;
use App\Models\Department;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Welcome', [
    'departments' => Department::forDisplay()->get(),
]))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect()->route(request()->user()->isAdmin() ? 'admin.dashboard' : 'member.home');
    })->name('dashboard');

    Route::get('/home', [AttendanceController::class, 'home'])->name('member.home');
    Route::get('/attendance', [AttendanceController::class, 'history'])->name('member.attendance');
    Route::get('/my-qr', [QrCodeController::class, 'myQr'])->name('member.my-qr');

    // Placeholders so navigation works; each is replaced by its build step.
    foreach (['events' => 'Events', 'elections' => 'Elections'] as $uri => $title) {
        Route::get("/{$uri}", fn () => Inertia::render('Member/Placeholder', ['title' => $title]))
            ->name('member.'.$uri);
    }

    Route::prefix('admin')->name('admin.')->middleware('role:super_admin|dept_admin')->group(function () {
        Route::get('/', DashboardController::class)->name('dashboard');

        Route::get('/members', [MemberController::class, 'index'])->name('members');
        Route::get('/members/export', [MemberController::class, 'export'])->name('members.export');
        Route::post('/members/approve', [MemberStatusController::class, 'approve'])->name('members.approve');
        Route::get('/members/{member}', [MemberController::class, 'show'])->name('members.show');
        Route::get('/members/{member}/edit', [MemberController::class, 'edit'])->name('members.edit');
        Route::patch('/members/{member}', [MemberController::class, 'update'])->name('members.update');
        Route::patch('/members/{member}/notes', [MemberController::class, 'updateNotes'])->name('members.notes');
        Route::post('/members/{member}/suspend', [MemberStatusController::class, 'suspend'])->name('members.suspend');
        Route::post('/members/{member}/reactivate', [MemberStatusController::class, 'reactivate'])->name('members.reactivate');
        Route::post('/members/{member}/reset-password', [MemberStatusController::class, 'resetPassword'])->name('members.reset-password');

        Route::get('/services', [ServiceController::class, 'index'])->name('services');
        Route::post('/services', [ServiceController::class, 'store'])->name('services.store');
        Route::patch('/services/{service}', [ServiceController::class, 'update'])->name('services.update');
        Route::delete('/services/{service}', [ServiceController::class, 'destroy'])->name('services.destroy');
        Route::post('/services/{service}/open', [ServiceController::class, 'open'])->name('services.open');
        Route::post('/services/{service}/close', [ServiceController::class, 'close'])->name('services.close');

        Route::get('/scanner', [ScannerController::class, 'index'])->name('scanner');
        Route::get('/scanner/{service}', [ScannerController::class, 'show'])->name('scanner.show');
        Route::post('/scanner/{service}/check-in', [ScannerController::class, 'checkIn'])->name('scanner.check-in');
        Route::post('/scanner/{service}/manual', [ScannerController::class, 'manual'])->name('scanner.manual');
        Route::get('/scanner/{service}/search', [ScannerController::class, 'search'])->name('scanner.search');

        Route::get('/reports', [ReportController::class, 'index'])->name('reports');
        Route::get('/reports/export/{format}', [ReportController::class, 'export'])->name('reports.export');

        foreach (['posts' => 'Posts', 'elections' => 'Elections'] as $uri => $title) {
            Route::get("/{$uri}", fn () => Inertia::render('Admin/Placeholder', ['title' => $title]))->name($uri);
        }

        Route::middleware('role:super_admin')->group(function () {
            Route::get('/departments', [DepartmentController::class, 'index'])->name('departments');
            Route::patch('/departments/{department}', [DepartmentController::class, 'update'])->name('departments.update');
            Route::post('/departments/{department}/admins', [DepartmentController::class, 'assignAdmin'])->name('departments.admins.store');
            Route::delete('/departments/{department}/admins/{user}', [DepartmentController::class, 'removeAdmin'])->name('departments.admins.destroy');
            Route::post('/current-department', [DepartmentController::class, 'switch'])->name('current-department');

            Route::get('/settings', fn () => Inertia::render('Admin/Placeholder', ['title' => 'Settings']))->name('settings');
        });
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/photos/{user}', [PhotoController::class, 'show'])->name('photos.show');
    Route::get('/qr/{user}', [QrCodeController::class, 'show'])->name('qr.show');
    Route::get('/id-card/{user}', [QrCodeController::class, 'idCard'])->name('id-card');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
});

require __DIR__.'/auth.php';
