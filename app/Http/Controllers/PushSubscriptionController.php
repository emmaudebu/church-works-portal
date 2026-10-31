<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PushSubscriptionController extends Controller
{
    /**
     * Remember a device that wants notifications.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'url:https', 'max:500'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->updatePushSubscription(
            $validated['endpoint'],
            $validated['keys']['p256dh'],
            $validated['keys']['auth'],
            'aes128gcm',
        );

        return response()->noContent();
    }

    /**
     * Forget a device.
     */
    public function destroy(Request $request): Response
    {
        $validated = $request->validate(['endpoint' => ['required', 'string', 'max:500']]);

        $request->user()->deletePushSubscription($validated['endpoint']);

        return response()->noContent();
    }
}
