<?php

use App\Http\Controllers\Admin\AttendanceLogController;
use App\Http\Controllers\Admin\BestMemberController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DepartmentContentController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\ElectionController as AdminElectionController;
use App\Http\Controllers\Admin\MemberController;
use App\Http\Controllers\Admin\MemberStatusController;
use App\Http\Controllers\Admin\PaymentController as AdminPaymentController;
use App\Http\Controllers\Admin\PostController as AdminPostController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\ScannerController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ElectionController;
use App\Http\Controllers\GalleryUploadController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\QrCodeController;
use App\Http\Controllers\SiteController;
use Illuminate\Support\Facades\Route;

Route::get('/', [SiteController::class, 'home'])->name('home');
Route::get('/departments', [SiteController::class, 'departments'])->name('departments');
Route::redirect('/departments/technical-unit', '/departments/technical-department', 301);
Route::get('/departments/{department:slug}', [SiteController::class, 'department'])->name('departments.show');
Route::get('/departments/{department:slug}/gallery', [SiteController::class, 'gallery'])->name('departments.gallery');
Route::get('/team/{user}/photo', [PhotoController::class, 'team'])->name('team.photo');
Route::get('/news', [SiteController::class, 'news'])->name('news');
Route::post('/paystack/webhook', [PaymentController::class, 'webhook'])->name('paystack.webhook');

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
    Route::get('/payments', [PaymentController::class, 'index'])->name('member.payments');
    Route::post('/payments/pay', [PaymentController::class, 'pay'])->name('member.payments.pay');
    Route::post('/payments/transfer', [PaymentController::class, 'transfer'])->name('member.payments.transfer');
    Route::get('/payments/callback', [PaymentController::class, 'callback'])->name('member.payments.callback');

    Route::get('/events', [PostController::class, 'index'])->name('member.events');
    Route::get('/elections', [ElectionController::class, 'index'])->name('member.elections');
    Route::get('/elections/{election}', [ElectionController::class, 'show'])->name('member.elections.show');
    Route::post('/elections/{election}/vote', [ElectionController::class, 'vote'])->name('member.elections.vote');
    Route::get('/elections/{election}/results', [ElectionController::class, 'results'])->name('member.elections.results');
    Route::get('/candidates/{candidate}/photo', [ElectionController::class, 'photo'])->name('candidates.photo');

    Route::get('/gallery/upload', [GalleryUploadController::class, 'index'])->name('gallery.upload');
    Route::post('/gallery/upload', [GalleryUploadController::class, 'store'])->name('gallery.upload.store');
    Route::delete('/gallery/upload/{image}', [GalleryUploadController::class, 'destroy'])->name('gallery.upload.destroy');

    Route::prefix('admin')->name('admin.')->middleware('office')->group(function () {
        Route::get('/', DashboardController::class)->name('dashboard');

        Route::get('/departments/{department}/manage', [DepartmentContentController::class, 'show'])->name('departments.manage')->middleware('office:manage_department');
        Route::post('/departments/{department}/page', [DepartmentController::class, 'updatePage'])->name('departments.page')->middleware('office:manage_department');
        Route::post('/departments/{department}/units', [DepartmentContentController::class, 'storeUnit'])->name('units.store')->middleware('office:manage_department');
        Route::patch('/units/{unit}', [DepartmentContentController::class, 'updateUnit'])->name('units.update')->middleware('office:manage_department');
        Route::delete('/units/{unit}', [DepartmentContentController::class, 'destroyUnit'])->name('units.destroy')->middleware('office:manage_department');
        Route::post('/departments/{department}/gallery', [DepartmentContentController::class, 'storeImages'])->name('gallery.store')->middleware('office:manage_department');
        Route::patch('/gallery/{image}', [DepartmentContentController::class, 'updateImage'])->name('gallery.update')->middleware('office:manage_department');
        Route::post('/departments/{department}/uploaders', [DepartmentContentController::class, 'storeUploader'])->name('gallery.uploaders.store');
        Route::delete('/departments/{department}/uploaders/{user}', [DepartmentContentController::class, 'destroyUploader'])->name('gallery.uploaders.destroy');
        Route::patch('/gallery/{image}/occasion', [DepartmentContentController::class, 'moveOccasion'])->name('gallery.occasion')->middleware('office:manage_department');
        Route::delete('/gallery/{image}', [DepartmentContentController::class, 'destroyImage'])->name('gallery.destroy')->middleware('office:manage_department');

        Route::patch('/departments/{department}/bank', [DepartmentController::class, 'updateBank'])->name('departments.bank');
        Route::post('/departments/{department}/admins', [DepartmentController::class, 'assignAdmin'])->name('departments.admins.store');
        Route::delete('/departments/{department}/admins/{user}', [DepartmentController::class, 'removeAdmin'])->name('departments.admins.destroy');

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

        Route::get('/services', [ServiceController::class, 'index'])->name('services')->middleware('office:manage_services');
        Route::post('/services', [ServiceController::class, 'store'])->name('services.store')->middleware('office:manage_services');
        Route::patch('/services/{service}', [ServiceController::class, 'update'])->name('services.update')->middleware('office:manage_services');
        Route::delete('/services/{service}', [ServiceController::class, 'destroy'])->name('services.destroy')->middleware('office:manage_services');
        Route::post('/services/{service}/open', [ServiceController::class, 'open'])->name('services.open')->middleware('office:manage_services');
        Route::post('/services/{service}/close', [ServiceController::class, 'close'])->name('services.close')->middleware('office:manage_services');

        Route::get('/scanner', [ScannerController::class, 'index'])->name('scanner')->middleware('office:take_attendance');
        Route::get('/scanner/{service}', [ScannerController::class, 'show'])->name('scanner.show')->middleware('office:take_attendance');
        Route::post('/scanner/{service}/check-in', [ScannerController::class, 'checkIn'])->name('scanner.check-in')->middleware('office:take_attendance');
        Route::post('/scanner/{service}/manual', [ScannerController::class, 'manual'])->name('scanner.manual')->middleware('office:take_attendance');
        Route::get('/scanner/{service}/search', [ScannerController::class, 'search'])->name('scanner.search')->middleware('office:take_attendance');

        Route::get('/reports', [ReportController::class, 'index'])->name('reports')->middleware('office:view_reports');
        Route::get('/reports/export/{format}', [ReportController::class, 'export'])->name('reports.export')->middleware('office:view_reports');
        Route::get('/attendance-log', [AttendanceLogController::class, 'index'])->name('attendance-log')->middleware('office:view_reports');
        Route::get('/attendance-log/{service}/export', [AttendanceLogController::class, 'export'])->name('attendance-log.export')->middleware('office:view_reports');

        Route::get('/payments', [AdminPaymentController::class, 'index'])->name('payments')->middleware('office:view_payments');
        Route::post('/payments/{payment}/approve', [AdminPaymentController::class, 'approve'])->name('payments.approve')->middleware('office:approve_payments');
        Route::post('/payments/{payment}/reject', [AdminPaymentController::class, 'reject'])->name('payments.reject')->middleware('office:approve_payments');
        Route::post('/dues', [AdminPaymentController::class, 'store'])->name('dues.store')->middleware('office:manage_payments');
        Route::post('/dues/{due}/toggle', [AdminPaymentController::class, 'toggle'])->name('dues.toggle')->middleware('office:manage_payments');
        Route::delete('/dues/{due}', [AdminPaymentController::class, 'destroy'])->name('dues.destroy')->middleware('office:manage_payments');
        Route::post('/dues/{due}/cash', [AdminPaymentController::class, 'recordCash'])->name('dues.cash')->middleware('office:record_payments');
        Route::get('/dues/{due}/export', [AdminPaymentController::class, 'export'])->name('dues.export')->middleware('office:view_payments');

        Route::get('/posts', [AdminPostController::class, 'index'])->name('posts')->middleware('office:manage_posts');
        Route::get('/posts/create', [AdminPostController::class, 'create'])->name('posts.create')->middleware('office:manage_posts');
        Route::post('/posts', [AdminPostController::class, 'store'])->name('posts.store')->middleware('office:manage_posts');
        Route::get('/posts/{post}/edit', [AdminPostController::class, 'edit'])->name('posts.edit')->middleware('office:manage_posts');
        Route::patch('/posts/{post}', [AdminPostController::class, 'update'])->name('posts.update')->middleware('office:manage_posts');
        Route::delete('/posts/{post}', [AdminPostController::class, 'destroy'])->name('posts.destroy')->middleware('office:manage_posts');

        Route::get('/elections', [AdminElectionController::class, 'index'])->name('elections')->middleware('office:manage_elections');
        Route::post('/elections', [AdminElectionController::class, 'store'])->name('elections.store')->middleware('office:manage_elections');
        Route::get('/elections/{election}', [AdminElectionController::class, 'show'])->name('elections.show')->middleware('office:manage_elections');
        Route::patch('/elections/{election}', [AdminElectionController::class, 'update'])->name('elections.update')->middleware('office:manage_elections');
        Route::delete('/elections/{election}', [AdminElectionController::class, 'destroy'])->name('elections.destroy')->middleware('office:manage_elections');
        Route::post('/elections/{election}/close', [AdminElectionController::class, 'close'])->name('elections.close')->middleware('office:manage_elections');
        Route::patch('/elections/{election}/results', [AdminElectionController::class, 'setResultsVisibility'])->name('elections.results')->middleware('office:manage_elections');
        Route::post('/elections/{election}/positions', [AdminElectionController::class, 'storePosition'])->name('positions.store')->middleware('office:manage_elections');
        Route::delete('/positions/{position}', [AdminElectionController::class, 'destroyPosition'])->name('positions.destroy')->middleware('office:manage_elections');
        Route::post('/positions/{position}/candidates', [AdminElectionController::class, 'storeCandidate'])->name('candidates.store')->middleware('office:manage_elections');
        Route::delete('/candidates/{candidate}', [AdminElectionController::class, 'destroyCandidate'])->name('candidates.destroy')->middleware('office:manage_elections');

        Route::middleware('role:super_admin')->group(function () {
            Route::get('/departments', [DepartmentController::class, 'index'])->name('departments');
            Route::post('/departments', [DepartmentController::class, 'store'])->name('departments.store');
            Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->name('departments.destroy');
            Route::patch('/departments/{department}', [DepartmentController::class, 'update'])->name('departments.update');
            Route::post('/current-department', [DepartmentController::class, 'switch'])->name('current-department');

            Route::put('/best-member', [BestMemberController::class, 'update'])->name('best-member.update');
            Route::post('/best-member/recalculate', [BestMemberController::class, 'recalculate'])->name('best-member.recalculate');

            Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
            Route::post('/settings/branding', [SettingsController::class, 'updateBranding'])->name('settings.branding');
            Route::put('/settings/colors', [SettingsController::class, 'updateColors'])->name('settings.colors');
            Route::put('/settings/services', [SettingsController::class, 'updateServices'])->name('settings.services');
            Route::post('/settings/home', [SettingsController::class, 'updateHome'])->name('settings.home');
            Route::put('/settings/verses', [SettingsController::class, 'updateVerseToast'])->name('settings.verses');
            Route::post('/settings/popup', [SettingsController::class, 'updatePopup'])->name('settings.popup');
            Route::post('/settings/paystack', [SettingsController::class, 'updatePaystack'])->name('settings.paystack');
            Route::put('/settings/whatsapp', [SettingsController::class, 'updateWhatsapp'])->name('settings.whatsapp');
            Route::put('/settings/permissions', [SettingsController::class, 'updatePermissions'])->name('settings.permissions');
            Route::post('/settings/super-admins', [SettingsController::class, 'storeSuperAdmin'])->name('settings.super-admins.store');
            Route::delete('/settings/super-admins/{user}', [SettingsController::class, 'destroySuperAdmin'])->name('settings.super-admins.destroy');
        });
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/photos/{user}', [PhotoController::class, 'show'])->name('photos.show');
    Route::post('/push/subscribe', [PushSubscriptionController::class, 'store'])->name('push.store');
    Route::post('/push/unsubscribe', [PushSubscriptionController::class, 'destroy'])->name('push.destroy');
    Route::get('/receipts/{payment}', [PaymentController::class, 'receipt'])->name('payments.receipt');
    Route::get('/certificates/{user}/{type}', [CertificateController::class, 'show'])->name('certificates.show');
    Route::get('/qr/{user}', [QrCodeController::class, 'show'])->name('qr.show');
    Route::get('/id-card/{user}', [QrCodeController::class, 'idCard'])->name('id-card');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
});

require __DIR__.'/auth.php';

// Sends unknown addresses through the web middleware so the error page has
// the church's name and logo.
Route::fallback(fn () => abort(404));
