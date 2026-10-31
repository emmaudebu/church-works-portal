<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Certificates;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CertificateController extends Controller
{
    /**
     * Serve a certificate to the member themselves or an admin who can view them.
     */
    public function show(Request $request, User $user, string $type): StreamedResponse
    {
        abort_unless(isset(Certificates::TYPES[$type]), 404);
        abort_unless($request->user()->is($user) || $request->user()->canView($user), 403);

        $path = $user->{Certificates::TYPES[$type]};

        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, headers: [
            'Cache-Control' => 'private, no-store',
            'Content-Security-Policy' => 'sandbox',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
