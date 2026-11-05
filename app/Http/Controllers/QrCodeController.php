<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class QrCodeController extends Controller
{
    /**
     * Display the member's own QR screen.
     */
    public function myQr(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Member/MyQr', [
            'member_id' => $user->member_id,
            'qr_url' => $user->isActive() ? route('qr.show', $user) : null,
        ]);
    }

    /**
     * Serve a QR code as an image. It holds the random token and nothing else.
     */
    public function show(Request $request, User $user): HttpResponse
    {
        $this->authorizeFor($request, $user);

        $svg = QrCode::format('svg')->size(512)->margin(1)->errorCorrection('M')->generate($user->qr_token);

        return response((string) $svg, headers: [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * Display a printable ID card.
     */
    public function idCard(Request $request, User $user): Response
    {
        $this->authorizeFor($request, $user);

        return Inertia::render('IdCard', [
            'member' => [
                ...$user->only(['full_name', 'member_id', 'unit']),
                'department' => $user->department?->name,
                'office' => $user->office() ?? 'Member',
                'photo_url' => $user->photoUrl(),
                'qr_url' => route('qr.show', $user),
            ],
        ]);
    }

    /**
     * Codes and cards exist only for active members, and only the member or an
     * admin who can view them may see one.
     */
    private function authorizeFor(Request $request, User $user): void
    {
        abort_unless($request->user()->is($user) || $request->user()->canView($user), 403);
        abort_unless($user->isActive(), 403);
    }
}
