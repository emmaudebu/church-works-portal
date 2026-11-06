<?php

namespace App\Http\Middleware;

use App\Models\Department;
use App\Support\CurrentDepartment;
use App\Support\Offices;
use App\Support\PaymentReceipt;
use App\Support\PaymentReviews;
use App\Support\Settings;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'full_name' => $request->user()->full_name,
                    'phone' => $request->user()->phone,
                    'email' => $request->user()->email,
                    'email_verified_at' => $request->user()->email_verified_at,
                    'status' => $request->user()->status,
                    'roles' => $request->user()->getRoleNames(),
                    'is_admin' => $request->user()->isAdmin(),
                    'office' => $request->user()->office(),
                    'permissions' => $request->user()->hasRole('super_admin')
                        ? Offices::permissions()
                        : $request->user()->getAllPermissions()->pluck('name'),
                    'unit' => $request->user()->unit,
                    'department_id' => $request->user()->department_id,
                    'department' => $request->user()->department?->name,
                    'photo_url' => $request->user()->photoUrl(),
                    'must_change_password' => $request->user()->must_change_password,
                ] : null,
            ],
            'branding' => fn () => Settings::branding(),
            'popup' => fn () => Settings::publicPopup(),
            'verseToast' => fn () => Settings::publicVerseToast(),
            'pendingReceipts' => fn () => $request->user()?->isAdmin() && $request->user()->canDo('approve_payments')
                ? PaymentReviews::count($request->user())
                : 0,
            'receiptReady' => fn () => $request->user() ? PaymentReceipt::waiting($request->user()) : null,
            'whatsappTemplates' => fn () => $request->user()?->isAdmin() ? Settings::whatsapp() : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'temp_password' => fn () => $request->session()->get('temp_password'),
            ],
            'departmentContext' => fn () => $this->departmentContext($request),
            'singleDepartment' => fn () => Department::single()?->only(['name', 'slug']),
        ];
    }

    /**
     * Describe the admin's working department for the top bar.
     *
     * @return array<string, mixed>|null
     */
    protected function departmentContext(Request $request): ?array
    {
        $user = $request->user();

        if (! $user?->isAdmin()) {
            return null;
        }

        $currentId = CurrentDepartment::idFor($user);
        $single = Department::single();

        return [
            'current_id' => $currentId,
            'current_name' => Department::find($currentId ?? $single?->id)?->name,
            'options' => $user->hasRole('super_admin') && ! ($single && in_array($currentId, [null, $single->id]))
                ? Department::orderBy('name')->get(['id', 'name'])
                : null,
        ];
    }
}
