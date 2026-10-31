<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\MemberProfile;
use App\Support\Certificates;
use App\Support\MemberPhoto;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'vapidPublicKey' => config('webpush.vapid.public_key'),
            'member' => $request->user()->hasRole('super_admin') ? null : [
                ...$request->user()->only([
                    'full_name', 'gender', 'phone', 'email', 'address', 'unit',
                    'foundation_class_done', 'wofbi_done',
                ]),
                'date_of_birth' => $request->user()->date_of_birth?->toDateString(),
                'date_joined' => $request->user()->date_joined?->toDateString(),
                'profile' => $request->user()->profile,
                'certificate_urls' => Certificates::urls($request->user()),
                'units' => $request->user()->department?->units->pluck('name') ?? [],
                'show_on_site' => $request->user()->show_on_site,
            ],
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = Certificates::apply($request, Arr::except($request->validated(), 'photo'), $user);

        if ($request->hasFile('photo')) {
            $data['photo'] = MemberPhoto::store($request->file('photo'), $user->photo);
        }

        $user->fill(Arr::except($data, MemberProfile::BIO_FIELDS));

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        if (! $user->hasRole('super_admin')) {
            $user->profile()->updateOrCreate([], Arr::only($data, MemberProfile::BIO_FIELDS));
        }

        return Redirect::route('profile.edit');
    }
}
