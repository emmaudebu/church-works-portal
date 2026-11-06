<?php

namespace App\Http\Controllers\Admin;

use App\Exports\PaymentsExport;
use App\Http\Controllers\Controller;
use App\Models\Due;
use App\Models\Payment;
use App\Models\User;
use App\Support\CurrentDepartment;
use App\Support\Dues;
use App\Support\PaymentReviews;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PaymentController extends Controller
{
    private const MINIMUM_NAIRA = 50;

    /**
     * Display dues, who has paid and who is owing.
     */
    public function index(Request $request): Response
    {
        $admin = $request->user();
        $dues = Due::managedBy($admin)->with('department:id,name')->latest()->get();

        $selected = $dues->firstWhere('id', (int) $request->query('due')) ?? $dues->firstWhere('is_active', true) ?? $dues->first();
        $departmentId = CurrentDepartment::forNewRecords($admin);
        $monthly = $departmentId ? Dues::standing($departmentId) : null;

        return Inertia::render('Admin/Payments', [
            'monthly' => $monthly ? [
                ...$monthly->only(['id', 'amount', 'is_active']),
                'starts_on' => $monthly->starts_on->format('Y-m'),
            ] : null,
            'dues' => $dues->map(fn (Due $due) => [
                ...$due->only(['id', 'title', 'type', 'amount', 'is_active']),
                'department' => $due->department->name,
                'starts_on' => $due->starts_on->toDateString(),
                'has_payments' => $due->payments()->exists(),
            ]),
            'selected' => $selected?->id,
            'report' => $selected ? $this->report($selected, $this->period($request, $selected)) : null,
            'reviews' => PaymentReviews::list($admin),
            'transactions' => Payment::whereIn('due_id', $dues->pluck('id'))
                ->where('status', 'success')
                ->with('user:id,full_name')
                ->latest('paid_at')
                ->limit(30)
                ->get()
                ->map->toRow(),
            'canCreate' => CurrentDepartment::forNewRecords($admin) !== null,
        ]);
    }

    /**
     * Download the paid and owing list.
     */
    public function export(Request $request, Due $due): BinaryFileResponse
    {
        $this->authorizeFor($request, $due);

        $report = $this->report($due, $this->period($request, $due));

        return Excel::download(
            new PaymentsExport($report['members']),
            Str::slug($due->title).'-'.$report['period'].'.xlsx',
        );
    }

    /**
     * Create a one-off levy in the admin's working department. Monthly dues
     * are set once with an amount instead, see saveMonthly.
     */
    public function store(Request $request): RedirectResponse
    {
        $departmentId = CurrentDepartment::forNewRecords($request->user());

        abort_unless($departmentId, 422, 'Choose a department first.');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:'.self::MINIMUM_NAIRA, 'max:10000000'],
            'starts_on' => ['required', 'date'],
            'due_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
        ]);

        Due::create([
            ...$validated,
            'type' => 'levy',
            'amount' => (int) round($validated['amount'] * 100),
            'department_id' => $departmentId,
        ]);

        return back()->with('success', 'Levy created.');
    }

    /**
     * Set how much the department's monthly dues are. Every member then owes
     * that amount each month, from the starting month or when they joined.
     */
    public function saveMonthly(Request $request): RedirectResponse
    {
        $departmentId = CurrentDepartment::forNewRecords($request->user());

        abort_unless($departmentId, 422, 'Choose a department first.');

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:'.self::MINIMUM_NAIRA, 'max:10000000'],
            'starts_on' => ['required', 'date_format:Y-m'],
        ], [
            'starts_on.date_format' => 'Choose the month dues start from.',
        ]);

        $attributes = [
            'amount' => (int) round($validated['amount'] * 100),
            'starts_on' => "{$validated['starts_on']}-01",
        ];

        $due = Dues::standing($departmentId);

        if ($due) {
            $due->update($attributes);
        } else {
            Due::create([...$attributes, 'department_id' => $departmentId, 'title' => 'Monthly dues', 'type' => 'monthly']);
        }

        return back()->with('success', 'Monthly dues saved.');
    }

    /**
     * Stop or restart collecting a due.
     */
    public function toggle(Request $request, Due $due): RedirectResponse
    {
        $this->authorizeFor($request, $due);

        $due->update(['is_active' => ! $due->is_active]);

        return back()->with('success', $due->is_active ? 'Due restarted.' : 'Due stopped.');
    }

    /**
     * Delete a due nobody has paid.
     */
    public function destroy(Request $request, Due $due): RedirectResponse
    {
        $this->authorizeFor($request, $due);

        if ($due->payments()->exists()) {
            throw ValidationException::withMessages(['due' => 'A due with payments can not be deleted. Stop it instead.']);
        }

        $due->delete();

        return back()->with('success', 'Due deleted.');
    }

    /**
     * Record money handed over in person.
     */
    public function recordCash(Request $request, Due $due): RedirectResponse
    {
        $this->authorizeFor($request, $due);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'period' => ['required', 'string', 'max:7'],
            'months' => ['nullable', 'integer', 'min:1', 'max:'.Dues::MAX_MONTHS],
        ]);

        $member = User::findOrFail($validated['user_id']);

        abort_unless($member->department_id === $due->department_id, 404);

        if (! Dues::isOwing($member, $due, $validated['period'])) {
            throw ValidationException::withMessages(['payment' => "{$member->full_name} does not owe this."]);
        }

        $periods = $due->type === 'monthly'
            ? Dues::payablePeriods($member, $due, (int) ($validated['months'] ?? 1), $validated['period'])
            : [Dues::ONE_OFF];

        $batch = 'CASH-'.Str::upper(Str::random(16));

        foreach (array_values($periods) as $index => $period) {
            Payment::create([
                'user_id' => $member->id,
                'due_id' => $due->id,
                'purpose' => $due->title,
                'period' => $period,
                'amount' => $due->amount,
                'reference' => $batch.'-'.($index + 1),
                'batch' => $batch,
                'status' => 'success',
                'method' => 'cash',
                'paid_at' => now(),
                'recorded_by' => $request->user()->id,
            ]);
        }

        return back()->with('success', "Cash payment recorded for {$member->full_name}.");
    }

    /**
     * Accept a transfer after checking its receipt against the bank account.
     */
    public function approve(Request $request, Payment $payment): RedirectResponse
    {
        $this->authorizeReview($request, $payment);

        $payments = $payment->withBatch();

        $payments->each(fn (Payment $row) => Dues::markPaid($row, $request->user()));

        PaymentReviews::notifyMember($payments, approved: true);

        return back()->with('success', 'Payment approved.');
    }

    /**
     * Turn down a transfer, telling the member why.
     */
    public function reject(Request $request, Payment $payment): RedirectResponse
    {
        $this->authorizeReview($request, $payment);

        $validated = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        $payments = $payment->withBatch();

        $payments->each->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['reason'],
            'recorded_by' => $request->user()->id,
        ]);

        PaymentReviews::notifyMember($payments, approved: false);

        return back()->with('success', 'Receipt rejected.');
    }

    /**
     * Only a receipt still waiting can be decided, and never by the person who paid.
     */
    private function authorizeReview(Request $request, Payment $payment): void
    {
        abort_unless($payment->due && $request->user()->canAccessDepartment($payment->due->department_id), 404);
        abort_unless($payment->status === 'under_review', 422, 'This receipt has already been decided.');
        abort_if($payment->user_id === $request->user()->id, 403, 'Another admin must approve your own payment.');
    }

    private function authorizeFor(Request $request, Due $due): void
    {
        abort_unless($request->user()->canAccessDepartment($due->department_id), 404);
    }

    private function period(Request $request, Due $due): string
    {
        if ($due->type === 'levy') {
            return Dues::ONE_OFF;
        }

        $period = (string) $request->query('period');

        return preg_match('/^\d{4}-\d{2}$/', $period) ? $period : now()->format('Y-m');
    }

    /**
     * @return array<string, mixed>
     */
    private function report(Due $due, string $period): array
    {
        $payments = $due->payments()->where('period', $period)->where('status', 'success')->get()->keyBy('user_id');
        $inReview = $due->payments()->where('period', $period)->where('status', 'under_review')->pluck('user_id')->flip();

        $members = User::where('department_id', $due->department_id)
            ->where('status', 'active')
            ->orderBy('full_name')
            ->get()
            ->filter(fn (User $member) => in_array($period, Dues::periods($due, $member)) || $payments->has($member->id))
            ->map(fn (User $member) => [
                ...$member->only(['id', 'member_id', 'full_name', 'unit']),
                'paid' => $payments->has($member->id),
                'under_review' => $inReview->has($member->id),
                'amount' => $payments->get($member->id)?->amount ?? $due->amount,
                'method' => $payments->get($member->id)?->method,
                'paid_at' => $payments->get($member->id)?->paid_at?->format('j M Y'),
            ])
            ->sortBy('paid')
            ->values();

        return [
            'due_id' => $due->id,
            'title' => $due->title,
            'type' => $due->type,
            'period' => $period,
            'period_label' => Dues::periodLabel($period),
            'members' => $members,
            'paid_count' => $members->where('paid', true)->count(),
            'owing_count' => $members->where('paid', false)->count(),
            'collected' => $members->where('paid', true)->sum('amount'),
            'outstanding' => $members->where('paid', false)->sum('amount'),
        ];
    }
}
