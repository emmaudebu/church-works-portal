<?php

namespace App\Http\Controllers;

use App\Models\Due;
use App\Models\Payment;
use App\Models\User;
use App\Support\Dues;
use App\Support\Paystack;
use App\Support\PrivateDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PaymentController extends Controller
{
    /**
     * Display what a member owes and has paid.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Member/Payments', [
            'owing' => Dues::owing($user),
            'payable' => Dues::payable($user),
            'history' => $user->payments()->where('status', 'success')->latest('paid_at')->limit(50)->get()->map->toRow(),
            'canPayOnline' => Paystack::isConfigured(),
            'bankAccount' => $user->department?->hasBankAccount() ? $user->department->bankAccount() : null,
            'memberId' => $user->member_id,
        ]);
    }

    /**
     * Start paying a due online and send the member to Paystack.
     */
    public function pay(Request $request): SymfonyResponse
    {
        $validated = $request->validate($this->choiceRules());

        $user = $request->user();
        $due = Due::findOrFail($validated['due_id']);
        $periods = Dues::payablePeriods($user, $due, $this->months($validated, $due));

        if ($periods === []) {
            return back()->withErrors(['payment' => 'This has already been paid or is not due.']);
        }

        if (! Paystack::isConfigured()) {
            return back()->withErrors(['payment' => 'Online payment is not available yet. Please pay your department admin.']);
        }

        $batch = 'CW-'.Str::upper(Str::random(20));
        $payments = $this->createPayments($user, $due, $periods, $batch, ['method' => 'paystack']);

        try {
            $url = Paystack::initialize(
                $user->email ?? "member{$user->id}@example.com",
                $payments->sum('amount'),
                $batch,
                route('member.payments.callback'),
                ['months' => count($periods), 'covers' => Dues::rangeLabel($periods)],
            );
        } catch (RuntimeException) {
            $payments->each->update(['status' => 'failed']);

            return back()->withErrors(['payment' => 'Paystack could not start this payment. Please try again.']);
        }

        return Inertia::location($url);
    }

    /**
     * Submit a bank transfer with its receipt for an admin to check.
     */
    public function transfer(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            ...$this->choiceRules(),
            'receipt' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:8192'],
        ], [
            'receipt.required' => 'Please upload your payment receipt.',
            'receipt.mimes' => 'Upload a PDF or a photo (JPG, PNG or WebP).',
        ]);

        $user = $request->user();
        $due = Due::findOrFail($validated['due_id']);
        $periods = Dues::payablePeriods($user, $due, $this->months($validated, $due));

        if ($periods === []) {
            return back()->withErrors(['payment' => 'This has already been paid or is being checked.']);
        }

        if (! $user->department?->hasBankAccount()) {
            return back()->withErrors(['payment' => 'Your department has no bank account set up yet.']);
        }

        $this->createPayments($user, $due, $periods, 'TRF-'.Str::upper(Str::random(16)), [
            'status' => 'under_review',
            'method' => 'transfer',
            'receipt' => PrivateDocument::store($request->file('receipt'), 'receipts'),
        ]);

        return back()->with('success', 'Receipt received. An admin will confirm your payment.');
    }

    /**
     * Serve a receipt to its owner or an admin who can view them.
     */
    public function receipt(Request $request, Payment $payment): StreamedResponse
    {
        abort_unless($request->user()->is($payment->user) || $request->user()->canView($payment->user), 403);
        abort_unless($payment->receipt && Storage::disk('local')->exists($payment->receipt), 404);

        return Storage::disk('local')->response($payment->receipt, headers: [
            'Cache-Control' => 'private, no-store',
            'Content-Security-Policy' => 'sandbox',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Where Paystack returns the member. The result always comes from Paystack
     * itself, never from the address the browser arrived on.
     */
    public function callback(Request $request): RedirectResponse
    {
        $reference = (string) $request->query('reference');
        $payments = Payment::forReference($reference);

        abort_unless($payments->isNotEmpty() && $payments->every('user_id', $request->user()->id), 404);

        try {
            $paid = $payments->every('status', 'success') || Dues::settle($payments, Paystack::verify($reference));
        } catch (RuntimeException) {
            return to_route('member.payments')->withErrors(['payment' => 'We could not confirm your payment yet. It will update shortly.']);
        }

        return $paid
            ? to_route('member.payments')->with('success', 'Payment received. Thank you.')
            : to_route('member.payments')->withErrors(['payment' => 'That payment did not go through.']);
    }

    /**
     * Paystack's server telling us about a payment, in case the member never
     * comes back to the site.
     */
    public function webhook(Request $request): HttpResponse
    {
        abort_unless(Paystack::validSignature($request->getContent(), $request->header('x-paystack-signature')), 401);

        if ($request->input('event') === 'charge.success') {
            $payments = Payment::forReference((string) $request->input('data.reference'));

            if ($payments->isNotEmpty()) {
                Dues::settle($payments, (array) $request->input('data'));
            }
        }

        return response()->noContent(200);
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function choiceRules(): array
    {
        return [
            'due_id' => ['required', 'integer', 'exists:dues,id'],
            'months' => ['nullable', 'integer', 'min:1', 'max:'.Dues::MAX_MONTHS],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function months(array $validated, Due $due): int
    {
        return $due->type === 'monthly' ? (int) ($validated['months'] ?? 1) : 1;
    }

    /**
     * One row per month, always at the amount set by the server.
     *
     * @param  array<int, string>  $periods
     * @param  array<string, mixed>  $attributes
     * @return Collection<int, Payment>
     */
    private function createPayments(User $user, Due $due, array $periods, string $batch, array $attributes): Collection
    {
        return DB::transaction(fn () => collect($periods)->values()->map(fn (string $period, int $index) => Payment::create([
            ...$attributes,
            'user_id' => $user->id,
            'due_id' => $due->id,
            'purpose' => $due->title,
            'period' => $period,
            'amount' => $due->amount,
            'reference' => $batch.'-'.($index + 1),
            'batch' => $batch,
        ])));
    }
}
