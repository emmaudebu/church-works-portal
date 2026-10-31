<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\User;
use App\Support\CurrentDepartment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
{
    /**
     * List departments with their admins.
     */
    public function index(): Response
    {
        return Inertia::render('Admin/Departments', [
            'departments' => Department::forDisplay()
                ->with(['users' => fn ($users) => $users->role('dept_admin')->select('id', 'department_id', 'full_name')->orderBy('full_name')])
                ->get(),
            'candidates' => User::where('status', 'active')
                ->withoutRole(['super_admin', 'dept_admin'])
                ->orderBy('full_name')
                ->get(['id', 'full_name']),
        ]);
    }

    /**
     * Switch a department between active and coming soon.
     */
    public function update(Request $request, Department $department): RedirectResponse
    {
        $department->update($request->validate([
            'status' => ['required', Rule::in(['active', 'coming_soon'])],
        ]));

        return back();
    }

    /**
     * Assign an active user as an admin of the department.
     */
    public function assignAdmin(Request $request, Department $department): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', Rule::exists('users', 'id')->where('status', 'active')],
        ]);

        $user = User::findOrFail($validated['user_id']);

        abort_if($user->hasRole('super_admin'), 422, 'A super admin can not be made a department admin.');

        $user->update(['department_id' => $department->id]);
        $user->syncRoles(['dept_admin']);

        return back();
    }

    /**
     * Return a department admin to being a regular member of the department.
     */
    public function removeAdmin(Department $department, User $user): RedirectResponse
    {
        abort_unless($user->department_id === $department->id && $user->hasRole('dept_admin'), 404);

        $user->syncRoles(['member']);

        return back();
    }

    /**
     * Set the department a super admin is working in.
     */
    public function switch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        session([CurrentDepartment::SESSION_KEY => $validated['department_id'] ?? null]);

        return back();
    }
}
