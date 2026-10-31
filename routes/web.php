<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\ElectionController as AdminElectionController;
use App\Http\Controllers\Admin\MemberController;
use App\Http\Controllers\Admin\MemberStatusController;
use App\Http\Controllers\Admin\PostController as AdminPostController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\ScannerController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ElectionController;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QrCodeController;
use App\Http\Controllers\SiteController;
use Illuminate\Support\Facades\Route;

Route::get('/', [SiteController::class, 'home'])->name('home');
Route::get('/departments', [SiteController::class, 'departments'])->name('departments');
Route::get('/departments/{department:slug}', [SiteController::class, 'department'])->name('departments.show');
Route::get('/news', [SiteController::class, 'news'])->name('news');
Route::get('/posts/{post}', [PostController::class, 'show'])->name('posts.show');
Route::get('/posts/{post}/calendar', [PostController::class, 'calendar'])->name('posts.calendar');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return redirect()->route(request()->user()->isAdmin() ? 'admin.dashboard' : 'member.home');
    })->name('dashboard');

    Route::get('/home', [AttendanceController::class, 'home'])->name('member.home');
    Route::get('/attendance', [AttendanceController::class, 'history'])->name('member.attendance');
    Route::get('/my-qr', [QrCodeController::class, 'myQr'])->name('member.my-qr');

    // Placeholders so navigation works; each is replaced by its build step.
    Route::get('/events', [PostController::class, 'index'])->name('member.events');
    Route::get('/elections', [ElectionController::class, 'index'])->name('member.elections');
    Route::get('/elections/{election}', [ElectionController::class, 'show'])->name('member.elections.show');
    Route::post('/elections/{election}/vote', [ElectionController::class, 'vote'])->name('member.elections.vote');
    Route::get('/elections/{election}/results', [ElectionController::class, 'results'])->name('member.elections.results');
    Route::get('/candidates/{candidate}/photo', [ElectionController::class, 'photo'])->name('candidates.photo');

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

        Route::get('/posts', [AdminPostController::class, 'index'])->name('posts');
        Route::get('/posts/create', [AdminPostController::class, 'create'])->name('posts.create');
        Route::post('/posts', [AdminPostController::class, 'store'])->name('posts.store');
        Route::get('/posts/{post}/edit', [AdminPostController::class, 'edit'])->name('posts.edit');
        Route::patch('/posts/{post}', [AdminPostController::class, 'update'])->name('posts.update');
        Route::delete('/posts/{post}', [AdminPostController::class, 'destroy'])->name('posts.destroy');

        Route::get('/elections', [AdminElectionController::class, 'index'])->name('elections');
        Route::post('/elections', [AdminElectionController::class, 'store'])->name('elections.store');
        Route::get('/elections/{election}', [AdminElectionController::class, 'show'])->name('elections.show');
        Route::patch('/elections/{election}', [AdminElectionController::class, 'update'])->name('elections.update');
        Route::delete('/elections/{election}', [AdminElectionController::class, 'destroy'])->name('elections.destroy');
        Route::post('/elections/{election}/close', [AdminElectionController::class, 'close'])->name('elections.close');
        Route::patch('/elections/{election}/results', [AdminElectionController::class, 'setResultsVisibility'])->name('elections.results');
        Route::post('/elections/{election}/positions', [AdminElectionController::class, 'storePosition'])->name('positions.store');
        Route::delete('/positions/{position}', [AdminElectionController::class, 'destroyPosition'])->name('positions.destroy');
        Route::post('/positions/{position}/candidates', [AdminElectionController::class, 'storeCandidate'])->name('candidates.store');
        Route::delete('/candidates/{candidate}', [AdminElectionController::class, 'destroyCandidate'])->name('candidates.destroy');

        Route::middleware('role:super_admin')->group(function () {
            Route::get('/departments', [DepartmentController::class, 'index'])->name('departments');
            Route::patch('/departments/{department}', [DepartmentController::class, 'update'])->name('departments.update');
            Route::post('/departments/{department}/page', [DepartmentController::class, 'updatePage'])->name('departments.page');
            Route::post('/departments/{department}/admins', [DepartmentController::class, 'assignAdmin'])->name('departments.admins.store');
            Route::delete('/departments/{department}/admins/{user}', [DepartmentController::class, 'removeAdmin'])->name('departments.admins.destroy');
            Route::post('/current-department', [DepartmentController::class, 'switch'])->name('current-department');

            Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
            Route::post('/settings/branding', [SettingsController::class, 'updateBranding'])->name('settings.branding');
            Route::put('/settings/colors', [SettingsController::class, 'updateColors'])->name('settings.colors');
            Route::put('/settings/services', [SettingsController::class, 'updateServices'])->name('settings.services');
            Route::post('/settings/home', [SettingsController::class, 'updateHome'])->name('settings.home');
            Route::post('/settings/popup', [SettingsController::class, 'updatePopup'])->name('settings.popup');
            Route::put('/settings/whatsapp', [SettingsController::class, 'updateWhatsapp'])->name('settings.whatsapp');
            Route::post('/settings/super-admins', [SettingsController::class, 'storeSuperAdmin'])->name('settings.super-admins.store');
            Route::delete('/settings/super-admins/{user}', [SettingsController::class, 'destroySuperAdmin'])->name('settings.super-admins.destroy');
        });
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/photos/{user}', [PhotoController::class, 'show'])->name('photos.show');
    Route::get('/certificates/{user}/{type}', [CertificateController::class, 'show'])->name('certificates.show');
    Route::get('/qr/{user}', [QrCodeController::class, 'show'])->name('qr.show');
    Route::get('/id-card/{user}', [QrCodeController::class, 'idCard'])->name('id-card');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
});

require __DIR__.'/auth.php';
