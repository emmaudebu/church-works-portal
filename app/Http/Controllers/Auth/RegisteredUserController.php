<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterMemberRequest;
use App\Models\Department;
use App\Models\MemberProfile;
use App\Models\User;
use App\Support\Certificates;
use App\Support\MemberPhoto;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration wizard.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register', [
            'departments' => Department::where('status', 'active')
                ->with('units:id,department_id,name')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Department $department) => [
                    ...$department->only(['id', 'name']),
                    'units' => $department->units->pluck('name'),
                ]),
        ]);
    }

    /**
     * Validate one wizard step before moving on to the next.
     */
    public function check(RegisterMemberRequest $request): RedirectResponse
    {
        return back();
    }

    /**
     * Handle an incoming registration request.
     */
    public function store(RegisterMemberRequest $request): RedirectResponse
    {
        $data = Certificates::apply($request, $request->validated());

        $photo = MemberPhoto::store($request->file('photo'));

        $user = DB::transaction(function () use ($data, $photo) {
            $user = User::create([
                ...Arr::except($data, [...MemberProfile::BIO_FIELDS, 'photo', 'password']),
                'photo' => $photo,
                'password' => Hash::make($data['password']),
                'status' => 'pending',
            ]);

            $user->profile()->create(Arr::only($data, MemberProfile::BIO_FIELDS));
            $user->assignRole('member');
            $user->update(['member_id' => User::nextMemberId($user)]);

            return $user;
        });

        event(new Registered($user));

        return to_route('register.pending');
    }

    /**
     * Confirm the registration is waiting for an admin.
     */
    public function pending(): Response
    {
        return Inertia::render('Auth/AwaitingApproval');
    }
}
