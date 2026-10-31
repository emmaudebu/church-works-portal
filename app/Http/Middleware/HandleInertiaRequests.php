<?php

namespace App\Http\Middleware;

use App\Models\Department;
use App\Support\CurrentDepartment;
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
                    'unit' => $request->user()->unit,
                    'department' => $request->user()->department?->name,
                    'photo_url' => $request->user()->photoUrl(),
                    'must_change_password' => $request->user()->must_change_password,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'temp_password' => fn () => $request->session()->get('temp_password'),
            ],
            'departmentContext' => fn () => $this->departmentContext($request),
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

        return [
            'current_id' => $currentId,
            'current_name' => $currentId ? Department::find($currentId)?->name : null,
            'options' => $user->hasRole('super_admin')
                ? Department::orderBy('name')->get(['id', 'name'])
                : null,
        ];
    }
}
