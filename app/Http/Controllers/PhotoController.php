<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PhotoController extends Controller
{
    /**
     * Serve a passport photo to the member themselves or an admin who can view them.
     */
    public function show(Request $request, User $user): StreamedResponse
    {
        abort_unless($request->user()->is($user) || $request->user()->canView($user), 403);
        abort_unless($user->photo && Storage::disk('local')->exists($user->photo), 404);

        return Storage::disk('local')->response($user->photo, headers: [
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }
}
