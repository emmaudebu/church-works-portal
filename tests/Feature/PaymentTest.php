<?php

use App\Models\Department;
use App\Models\Due;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\PaymentDecided;
use App\Notifications\PaymentSubmitted;
use App\Support\Dues;
use App\Support\Paystack;
use App\Support\Settings;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

const TEST_SECRET = 'sk_test_abcdefghijklmnop1234';

beforeEach(function () {
    Carbon::setTestNow('2026-11-15 10:00:00');

    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $this->technical = Department::firstWhere('slug', 'technical-department');
    $this->choir = Department::firstWhere('slug', 'choir');

    $this->superAdmin = User::factory()->create()->assignRole('super_admin');
    $this->admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $this->member->forceFill(['created_at' => '2026-09-10'])->save();
    $this->outsider = User::factory()->create(['department_id' => $this->choir->id])->assignRole('member');

    $this->due = Due::create([
        'department_id' => $this->technical->id, 'title' => 'Monthly dues', 'type' => 'monthly',
        'amount' => 200000, 'starts_on' => '2026-01-01',
    ])->refresh();

    Settings::set('paystack_secret', Crypt::encryptString(TEST_SECRET));
});

afterEach(fn () => Carbon::setTestNow());

function pendingPayment(object $test, string $period = '2026-11'): Payment
{
    return Payment::create([
        'user_id' => $test->member->id, 'due_id' => $test->due->id, 'purpose' => 'Monthly dues',
        'period' => $period, 'amount' => 200000, 'reference' => 'CW-TEST'.$period, 'method' => 'paystack',
    ]);
}

function fakeVerify(array $data): void
{
    Http::fake(['api.paystack.co/transaction/verify/*' => Http::response(['status' => true, 'data' => $data])]);
}

test('a monthly due is owed from when the member joined', function () {
    expect(Dues::owing($this->member)->pluck('period')->all())->toBe(['2026-09', '2026-10', '2026-11']);
});

test('a member who joined before the due only owes from its start', function () {
    $this->due->update(['starts_on' => '2026-10-20']);

    expect(Dues::owing($this->member)->pluck('period')->all())->toBe(['2026-10', '2026-11']);
});

test('a levy is owed once and a future or stopped due is not owed', function () {
    $levy = Due::create(['department_id' => $this->technical->id, 'title' => 'Retreat', 'type' => 'levy', 'amount' => 500000, 'starts_on' => '2026-11-01']);
    Due::create(['department_id' => $this->technical->id, 'title' => 'Later', 'type' => 'levy', 'amount' => 100000, 'starts_on' => '2027-01-01']);
    $this->due->update(['is_active' => false]);

    expect(Dues::owing($this->member)->pluck('due_id')->all())->toBe([$levy->id]);
});

test('another department does not owe this due', function () {
    expect(Dues::owing($this->outsider))->toHaveCount(0);
});

test('paying sends the member to paystack with the amount from the server', function () {
    Http::fake(['api.paystack.co/transaction/initialize' => Http::response([
        'status' => true, 'data' => ['authorization_url' => 'https://checkout.paystack.com/abc'],
    ])]);

    $this->actingAs($this->member)
        ->post(route('member.payments.pay'), ['due_id' => $this->due->id, 'amount' => 1], ['X-Inertia' => 'true'])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', 'https://checkout.paystack.com/abc');

    expect(Payment::first()->amount)->toBe(200000)
        ->and(Payment::first()->status)->toBe('pending');

    Http::assertSent(fn ($request) => $request['amount'] === 200000
        && $request->hasHeader('Authorization', 'Bearer '.TEST_SECRET));
});

test('a member can not pay something they do not owe', function () {
    Http::fake();

    $this->actingAs($this->outsider)
        ->post(route('member.payments.pay'), ['due_id' => $this->due->id])
        ->assertSessionHasErrors('payment');

    Http::assertNothingSent();
    expect(Payment::count())->toBe(0);
});

test('without keys online payment is refused politely', function () {
    Settings::set('paystack_secret', null);
    Http::fake();

    $this->actingAs($this->member)
        ->post(route('member.payments.pay'), ['due_id' => $this->due->id])
        ->assertSessionHasErrors('payment');

    $this->actingAs($this->member)->get('/payments')
        ->assertInertia(fn (Assert $page) => $page->where('canPayOnline', false)->has('owing', 3));
});

test('a paystack failure leaves nothing paid', function () {
    Http::fake(['*' => Http::response(['status' => false], 400)]);

    $this->actingAs($this->member)
        ->post(route('member.payments.pay'), ['due_id' => $this->due->id])
        ->assertSessionHasErrors('payment');

    expect(Payment::first()->status)->toBe('failed');
});

test('returning from paystack only counts once paystack confirms it', function () {
    $payment = pendingPayment($this);
    fakeVerify(['status' => 'success', 'amount' => 200000, 'currency' => 'NGN']);

    $this->actingAs($this->member)
        ->get(route('member.payments.callback', ['reference' => $payment->reference]))
        ->assertSessionHas('success');

    expect($payment->fresh()->status)->toBe('success')
        ->and($payment->fresh()->paid_at)->not->toBeNull()
        ->and(Dues::owing($this->member)->pluck('period')->all())->toBe(['2026-09', '2026-10']);
});

test('a failed or underpaid transaction is not accepted', function (array $data) {
    $payment = pendingPayment($this);
    fakeVerify($data);

    $this->actingAs($this->member)
        ->get(route('member.payments.callback', ['reference' => $payment->reference]))
        ->assertSessionHasErrors('payment');

    expect($payment->fresh()->status)->toBe('failed');
})->with([
    'declined' => [['status' => 'failed', 'amount' => 200000, 'currency' => 'NGN']],
    'underpaid' => [['status' => 'success', 'amount' => 100, 'currency' => 'NGN']],
    'wrong currency' => [['status' => 'success', 'amount' => 200000, 'currency' => 'USD']],
]);

test('someone else can not use your payment reference', function () {
    $payment = pendingPayment($this);
    Http::fake();

    $this->actingAs($this->outsider)
        ->get(route('member.payments.callback', ['reference' => $payment->reference]))
        ->assertNotFound();

    Http::assertNothingSent();
});

function webhook(object $test, array $body, ?string $secret = TEST_SECRET)
{
    $json = json_encode($body);

    return $test->call('POST', '/paystack/webhook', [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_PAYSTACK_SIGNATURE' => $secret ? hash_hmac('sha512', $json, $secret) : '',
    ], $json);
}

test('a signed webhook marks a payment paid even if the member never returns', function () {
    $payment = pendingPayment($this);

    webhook($this, ['event' => 'charge.success', 'data' => [
        'reference' => $payment->reference, 'status' => 'success', 'amount' => 200000, 'currency' => 'NGN',
    ]])->assertOk();

    expect($payment->fresh()->status)->toBe('success');
});

test('a webhook with a forged signature is rejected', function () {
    $payment = pendingPayment($this);

    webhook($this, ['event' => 'charge.success', 'data' => [
        'reference' => $payment->reference, 'status' => 'success', 'amount' => 200000, 'currency' => 'NGN',
    ]], 'sk_test_wrong')->assertUnauthorized();

    expect($payment->fresh()->status)->toBe('pending');
});

test('a repeated webhook changes nothing', function () {
    $payment = pendingPayment($this);
    $body = ['event' => 'charge.success', 'data' => [
        'reference' => $payment->reference, 'status' => 'success', 'amount' => 200000, 'currency' => 'NGN',
    ]];

    webhook($this, $body);

    $first = $payment->fresh()->paid_at->toDateTimeString();

    Carbon::setTestNow('2026-11-16 10:00:00');
    webhook($this, $body)->assertOk();

    expect($payment->fresh()->paid_at->toDateTimeString())->toBe($first);
});

test('a webhook with a smaller amount does not pay the due', function () {
    $payment = pendingPayment($this);

    webhook($this, ['event' => 'charge.success', 'data' => [
        'reference' => $payment->reference, 'status' => 'success', 'amount' => 100, 'currency' => 'NGN',
    ]])->assertOk();

    expect($payment->fresh()->status)->not->toBe('success');
});

test('a failure report can not undo a confirmed payment', function () {
    $payment = pendingPayment($this);
    $payment->update(['status' => 'success']);

    Dues::settle($payment->withBatch(), ['status' => 'failed']);

    expect($payment->fresh()->status)->toBe('success');
});

test('amounts are stored exactly in kobo', function () {
    $this->actingAs($this->admin)->post(route('admin.dues.store'), [
        'title' => 'Levy', 'type' => 'levy', 'amount' => '1999.99', 'starts_on' => '2026-11-01',
    ])->assertSessionHasNoErrors();

    expect(Due::firstWhere('title', 'Levy')->amount)->toBe(199999);
});

test('the treasurer view shows who has paid and who is owing', function () {
    pendingPayment($this)->update(['status' => 'success', 'paid_at' => now()]);

    $this->actingAs($this->admin)->get(route('admin.payments', ['due' => $this->due->id, 'period' => '2026-11']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Payments')
            ->where('report.paid_count', 1)
            ->where('report.owing_count', 1)
            ->where('report.collected', 200000)
            ->where('report.outstanding', 200000));
});

test('cash can be recorded once for a member who owes', function () {
    $this->actingAs($this->admin)->post(route('admin.dues.cash', $this->due), [
        'user_id' => $this->member->id, 'period' => '2026-11',
    ])->assertSessionHasNoErrors();

    expect(Payment::first()->method)->toBe('cash')
        ->and(Payment::first()->recorded_by)->toBe($this->admin->id);

    $this->actingAs($this->admin)->post(route('admin.dues.cash', $this->due), [
        'user_id' => $this->member->id, 'period' => '2026-11',
    ])->assertSessionHasErrors('payment');

    expect(Payment::count())->toBe(1);
});

test('department admins can not reach another department dues', function () {
    $due = Due::create(['department_id' => $this->choir->id, 'title' => 'Choir', 'type' => 'levy', 'amount' => 100000, 'starts_on' => '2026-01-01']);

    $this->actingAs($this->admin)->post(route('admin.dues.toggle', $due))->assertNotFound();
    $this->actingAs($this->admin)->delete(route('admin.dues.destroy', $due))->assertNotFound();
    $this->actingAs($this->admin)->get(route('admin.dues.export', $due))->assertNotFound();
    $this->actingAs($this->admin)->post(route('admin.dues.cash', $due), ['user_id' => $this->outsider->id, 'period' => 'once'])->assertNotFound();
    $this->actingAs($this->admin)->post(route('admin.dues.cash', $this->due), ['user_id' => $this->outsider->id, 'period' => '2026-11'])->assertNotFound();
});

test('members can not use the treasurer screens', function () {
    $this->actingAs($this->member)->get('/admin/payments')->assertForbidden();
    $this->actingAs($this->member)->post(route('admin.dues.cash', $this->due), ['user_id' => $this->member->id, 'period' => '2026-11'])->assertForbidden();
});

test('a due with payments can be stopped but not deleted', function () {
    pendingPayment($this);

    $this->actingAs($this->admin)->delete(route('admin.dues.destroy', $this->due))->assertSessionHasErrors('due');
    $this->actingAs($this->admin)->post(route('admin.dues.toggle', $this->due))->assertRedirect();

    expect($this->due->fresh()->is_active)->toBeFalse();
});

test('members only see their own payments', function () {
    pendingPayment($this)->update(['status' => 'success', 'paid_at' => now()]);

    $this->actingAs($this->outsider)->get('/payments')->assertInertia(fn (Assert $page) => $page->has('history', 0));
    $this->actingAs($this->member)->get('/payments')->assertInertia(fn (Assert $page) => $page->has('history', 1));
});

test('home shows what is owing', function () {
    $this->actingAs($this->member)->get('/home')->assertInertia(fn (Assert $page) => $page
        ->where('dues.count', 3)
        ->where('dues.total', 600000));
});

test('the secret key is stored encrypted and never sent to the browser', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.paystack'), [
        'public_key' => 'pk_test_123', 'secret_key' => 'sk_test_newsecretvalue9876', 'password' => 'password',
    ])->assertSessionHasNoErrors();

    expect(Settings::get('paystack_secret'))->not->toContain('newsecret')
        ->and(Paystack::secretKey())->toBe('sk_test_newsecretvalue9876');

    $this->actingAs($this->superAdmin)->get('/admin/settings')
        ->assertDontSee('sk_test_newsecretvalue9876')
        ->assertInertia(fn (Assert $page) => $page->where('paystack.secret_hint', '9876'));
});

test('saving keys needs your password and only a super admin can do it', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.paystack'), [
        'secret_key' => 'sk_test_x', 'password' => 'wrong',
    ])->assertSessionHasErrors('password');

    $this->actingAs($this->admin)->post(route('admin.settings.paystack'), [
        'secret_key' => 'sk_test_x', 'password' => 'password',
    ])->assertForbidden();

    expect(Paystack::secretKey())->toBe(TEST_SECRET);
});

test('leaving the secret key empty keeps the saved one', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.paystack'), [
        'public_key' => 'pk_test_123', 'password' => 'password',
    ])->assertSessionHasNoErrors();

    expect(Paystack::secretKey())->toBe(TEST_SECRET);
});

function setBank(object $test): void
{
    $test->technical->update(['bank_name' => 'Zenith Bank', 'account_number' => '1234567890', 'account_name' => 'Technical Department']);
}

function submitTransfer(object $test, ?User $member = null, int $months = 1)
{
    return $test->actingAs($member ?? $test->member)->post(route('member.payments.transfer'), [
        'due_id' => $test->due->id,
        'months' => $months,
        'receipt' => UploadedFile::fake()->image('receipt.jpg', 2400, 1200),
    ]);
}

test('only the financial secretary and the head can approve a proof of payment', function () {
    setBank($this);
    submitTransfer($this);

    $payment = Payment::where('status', 'under_review')->sole();
    $officer = fn (string $office) => User::factory()->create(['department_id' => $this->technical->id])->assignRole($office);

    $this->actingAs($officer('treasurer'))->post(route('admin.payments.approve', $payment))->assertForbidden();
    $this->actingAs($officer('vice_head'))->post(route('admin.payments.approve', $payment))->assertForbidden();

    $this->actingAs($officer('financial_secretary'))->post(route('admin.payments.approve', $payment))->assertRedirect();

    expect($payment->fresh()->status)->toBe('success');

    $this->actingAs($this->member)->get('/payments')->assertInertia(fn (Assert $page) => $page
        ->has('history', 1)
        ->has('waiting', 0));
});

test('a waiting proof shows on the approver dashboard and in the sidebar count', function () {
    setBank($this);
    submitTransfer($this, months: 3);

    $secretary = User::factory()->create(['department_id' => $this->technical->id])->assignRole('financial_secretary');
    $treasurer = User::factory()->create(['department_id' => $this->technical->id])->assignRole('treasurer');

    $this->actingAs($secretary)->get('/admin')->assertInertia(fn (Assert $page) => $page
        ->has('reviews', 1)
        ->where('reviews.0.amount', 600000)
        ->where('pendingReceipts', 1));

    $this->actingAs($treasurer)->get('/admin')->assertInertia(fn (Assert $page) => $page
        ->has('reviews', 0)
        ->where('pendingReceipts', 0));

    $this->actingAs($this->member)->get('/payments')->assertInertia(fn (Assert $page) => $page
        ->has('waiting', 1)
        ->where('waiting.0.amount', 600000));
});

test('a new proof notifies the financial secretary, or the head when there is none', function () {
    Notification::fake();
    setBank($this);

    $subscribe = fn (User $user) => $user->updatePushSubscription('https://push.example/'.$user->id);

    $subscribe($this->admin);

    submitTransfer($this);

    Notification::assertSentTo($this->admin, PaymentSubmitted::class);

    $secretary = User::factory()->create(['department_id' => $this->technical->id])->assignRole('financial_secretary');
    $subscribe($secretary);

    Notification::fake();

    submitTransfer($this, User::factory()->create(['department_id' => $this->technical->id])->assignRole('member'));

    Notification::assertSentTo($secretary, PaymentSubmitted::class);
    Notification::assertNotSentTo($this->admin, PaymentSubmitted::class);

    Notification::fake();

    submitTransfer($this, $secretary);

    Notification::assertSentTo($this->admin, PaymentSubmitted::class);
    Notification::assertNotSentTo($secretary, PaymentSubmitted::class);
});

test('the member hears the decision on their proof', function () {
    Notification::fake();
    setBank($this);

    $this->member->updatePushSubscription('https://push.example/member');

    submitTransfer($this);

    $this->actingAs($this->admin)->post(route('admin.payments.approve', Payment::where('status', 'under_review')->sole()));

    Notification::assertSentTo($this->member, PaymentDecided::class, fn (PaymentDecided $sent) => $sent->approved);
});

test('a member sees the bank account of their own department', function () {
    setBank($this);

    $this->actingAs($this->member)->get('/payments')->assertInertia(fn (Assert $page) => $page
        ->where('bankAccount.account_number', '1234567890'));

    $this->actingAs($this->outsider)->get('/payments')->assertInertia(fn (Assert $page) => $page
        ->where('bankAccount', null));
});

test('a transfer stays unpaid and locked until an admin approves it', function () {
    Storage::fake('local');
    setBank($this);

    submitTransfer($this)->assertSessionHasNoErrors();

    $payment = Payment::first();

    Storage::disk('local')->assertExists($payment->receipt);

    expect($payment->status)->toBe('under_review')
        ->and($payment->amount)->toBe(200000)
        ->and($payment->paid_at)->toBeNull();

    $item = Dues::owing($this->member)->firstWhere('period', '2026-09');

    expect($item['under_review'])->toBeTrue();

    expect(Dues::payablePeriods($this->member, $this->due))->toBe(['2026-10']);

    $this->actingAs($this->admin)->post(route('admin.payments.approve', $payment))->assertRedirect();

    expect($payment->fresh()->status)->toBe('success')
        ->and($payment->fresh()->recorded_by)->toBe($this->admin->id)
        ->and(Dues::owing($this->member)->pluck('period')->all())->toBe(['2026-10', '2026-11']);
});

test('a rejected receipt shows the reason and can be sent again', function () {
    Storage::fake('local');
    setBank($this);
    submitTransfer($this);
    $payment = Payment::first();

    $this->actingAs($this->admin)->post(route('admin.payments.reject', $payment), ['reason' => ''])
        ->assertSessionHasErrors('reason');

    $this->actingAs($this->admin)->post(route('admin.payments.reject', $payment), ['reason' => 'Wrong amount'])
        ->assertRedirect();

    $item = Dues::owing($this->member)->firstWhere('period', '2026-09');

    expect($item['under_review'])->toBeFalse()
        ->and($item['rejection_reason'])->toBe('Wrong amount');

    submitTransfer($this)->assertSessionHasNoErrors();

    expect(Payment::count())->toBe(2);
});

test('a decided receipt can not be decided again', function () {
    Storage::fake('local');
    setBank($this);
    submitTransfer($this);
    $payment = Payment::first();

    $this->actingAs($this->admin)->post(route('admin.payments.approve', $payment));
    $this->actingAs($this->admin)->post(route('admin.payments.reject', $payment), ['reason' => 'x'])->assertStatus(422);

    expect($payment->fresh()->status)->toBe('success');
});

test('an admin can not approve their own transfer', function () {
    Storage::fake('local');
    setBank($this);
    $this->admin->forceFill(['created_at' => '2026-09-10'])->save();

    submitTransfer($this, $this->admin);
    $payment = Payment::first();

    $this->actingAs($this->admin)->post(route('admin.payments.approve', $payment))->assertForbidden();
    $this->actingAs($this->superAdmin)->post(route('admin.payments.approve', $payment))->assertRedirect();

    expect($payment->fresh()->status)->toBe('success');
});

test('members and other departments can not decide receipts', function () {
    Storage::fake('local');
    setBank($this);
    submitTransfer($this);
    $payment = Payment::first();
    $choirAdmin = User::factory()->create(['department_id' => $this->choir->id])->assignRole('dept_admin');

    $this->actingAs($this->member)->post(route('admin.payments.approve', $payment))->assertForbidden();
    $this->actingAs($choirAdmin)->post(route('admin.payments.approve', $payment))->assertNotFound();

    expect($payment->fresh()->status)->toBe('under_review');
});

test('a receipt is required and must be a pdf or photo', function () {
    setBank($this);

    $this->actingAs($this->member)->post(route('member.payments.transfer'), ['due_id' => $this->due->id])
        ->assertSessionHasErrors('receipt');

    $this->actingAs($this->member)->post(route('member.payments.transfer'), [
        'due_id' => $this->due->id,
        'receipt' => UploadedFile::fake()->create('x.exe', 10, 'application/octet-stream'),
    ])->assertSessionHasErrors('receipt');
});

test('a transfer needs a department account', function () {
    Storage::fake('local');

    submitTransfer($this)->assertSessionHasErrors('payment');
});

test('receipts are private to the member and their admins', function () {
    Storage::fake('local');
    setBank($this);
    submitTransfer($this);
    $url = route('payments.receipt', Payment::first());

    $this->post('/logout');
    $this->get($url)->assertRedirect(route('login', absolute: false));

    $this->actingAs($this->outsider)->get($url)->assertForbidden();
    $this->actingAs($this->member)->get($url)->assertOk();
    $this->actingAs($this->admin)->get($url)->assertOk();
});

test('the treasurer view lists receipts waiting', function () {
    Storage::fake('local');
    setBank($this);
    submitTransfer($this);

    $this->actingAs($this->admin)->get(route('admin.payments', ['due' => $this->due->id, 'period' => '2026-09']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('reviews', 1)
            ->where('report.paid_count', 0));
});

test('the head and a super admin can change the bank account, with their password', function () {
    $data = ['bank_name' => 'GTBank', 'account_number' => '0123456789', 'account_name' => 'Tech', 'password' => 'password'];
    $url = route('admin.departments.bank', $this->technical);

    $this->actingAs($this->admin)->patch($url, [...$data, 'password' => 'wrong'])->assertSessionHasErrors('password');
    $this->actingAs($this->superAdmin)->patch($url, [...$data, 'password' => 'wrong'])->assertSessionHasErrors('password');

    expect($this->technical->fresh()->account_number)->toBeNull();

    $this->actingAs($this->admin)->patch($url, $data)->assertSessionHasNoErrors();

    expect($this->technical->fresh()->account_number)->toBe('0123456789');

    $this->actingAs($this->superAdmin)->patch($url, [...$data, 'account_number' => '9876543210'])->assertSessionHasNoErrors();

    expect($this->technical->fresh()->account_number)->toBe('9876543210');

    $this->actingAs($this->admin)->get(route('admin.departments.manage', $this->technical))
        ->assertInertia(fn (Assert $page) => $page->where('canEditBank', true));
});

test('nobody else can change the bank account', function () {
    $data = ['bank_name' => 'GTBank', 'account_number' => '0123456789', 'account_name' => 'Tech', 'password' => 'password'];

    $vice = User::factory()->create(['department_id' => $this->technical->id])->assignRole('vice_head');
    $otherHead = User::factory()->create(['department_id' => $this->choir->id])->assignRole('dept_admin');

    $this->actingAs($vice)->patch(route('admin.departments.bank', $this->technical), $data)->assertForbidden();
    $this->actingAs($otherHead)->patch(route('admin.departments.bank', $this->technical), $data)->assertForbidden();
    $this->actingAs($this->member)->patch(route('admin.departments.bank', $this->technical), $data)->assertForbidden();

    $this->actingAs($vice)->get(route('admin.departments.manage', $this->technical))
        ->assertInertia(fn (Assert $page) => $page->where('canEditBank', false));

    expect($this->technical->fresh()->account_number)->toBeNull();
});

test('a bank account must be complete with a numeric account number', function () {
    $this->actingAs($this->superAdmin)->patch(route('admin.departments.bank', $this->technical), [
        'bank_name' => 'GTBank', 'account_number' => 'abc', 'account_name' => '', 'password' => 'password',
    ])->assertSessionHasErrors(['account_number', 'account_name']);
});

test('paying six months covers what is owed then runs into future months', function () {
    Http::fake(['api.paystack.co/transaction/initialize' => Http::response([
        'status' => true, 'data' => ['authorization_url' => 'https://checkout.paystack.com/abc'],
    ])]);

    $this->actingAs($this->member)
        ->post(route('member.payments.pay'), ['due_id' => $this->due->id, 'months' => 6], ['X-Inertia' => 'true'])
        ->assertStatus(409);

    expect(Payment::orderBy('period')->pluck('period')->all())
        ->toBe(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);

    Http::assertSent(fn ($request) => $request['amount'] === 1200000);

    fakeVerify(['status' => 'success', 'amount' => 1200000, 'currency' => 'NGN']);

    $this->actingAs($this->member)
        ->get(route('member.payments.callback', ['reference' => Payment::first()->batch]))
        ->assertSessionHas('success');

    expect(Payment::where('status', 'success')->count())->toBe(6)
        ->and(Dues::owing($this->member))->toHaveCount(0);
});

test('months already paid are skipped', function () {
    pendingPayment($this, '2026-10')->update(['status' => 'success']);

    expect(Dues::payablePeriods($this->member, $this->due, 3))->toBe(['2026-09', '2026-11', '2026-12']);
});

test('a webhook settles every month in a batch only for the full total', function () {
    $rows = collect(['2026-09', '2026-10', '2026-11'])->map(fn ($period, $index) => Payment::create([
        'user_id' => $this->member->id, 'due_id' => $this->due->id, 'purpose' => 'Monthly dues', 'period' => $period,
        'amount' => 200000, 'reference' => "CW-B-{$index}", 'batch' => 'CW-B', 'method' => 'paystack',
    ]));

    webhook($this, ['event' => 'charge.success', 'data' => [
        'reference' => 'CW-B', 'status' => 'success', 'amount' => 200000, 'currency' => 'NGN',
    ]])->assertOk();

    expect(Payment::where('status', 'success')->count())->toBe(0);

    $rows->each->update(['status' => 'pending']);

    webhook($this, ['event' => 'charge.success', 'data' => [
        'reference' => 'CW-B', 'status' => 'success', 'amount' => 600000, 'currency' => 'NGN',
    ]])->assertOk();

    expect(Payment::where('status', 'success')->count())->toBe(3);
});

test('a multi-month transfer is one receipt to check and is decided as a whole', function () {
    Storage::fake('local');
    setBank($this);

    submitTransfer($this, months: 3)->assertSessionHasNoErrors();

    expect(Payment::pluck('receipt')->unique())->toHaveCount(1);

    $this->actingAs($this->admin)->get('/admin/payments')->assertInertia(fn (Assert $page) => $page
        ->has('reviews', 1)
        ->where('reviews.0.amount', 600000)
        ->where('reviews.0.period', 'September 2026 to November 2026 (3 months)'));

    $this->actingAs($this->admin)->post(route('admin.payments.reject', Payment::first()), ['reason' => 'Short']);

    expect(Payment::where('status', 'rejected')->count())->toBe(3);

    submitTransfer($this, months: 3);

    $this->actingAs($this->admin)->post(route('admin.payments.approve', Payment::where('status', 'under_review')->first()));

    expect(Payment::where('status', 'success')->count())->toBe(3);
});

test('a levy is always one payment and months are limited', function () {
    Http::fake();

    $this->actingAs($this->member)->post(route('member.payments.pay'), ['due_id' => $this->due->id, 'months' => 25])
        ->assertSessionHasErrors('months');

    $levy = Due::create(['department_id' => $this->technical->id, 'title' => 'Retreat', 'type' => 'levy', 'amount' => 500000, 'starts_on' => '2026-11-01'])->refresh();

    expect(Dues::payablePeriods($this->member, $levy, 6))->toBe([Dues::ONE_OFF]);
});

test('cash can cover several months', function () {
    $this->actingAs($this->admin)->post(route('admin.dues.cash', $this->due), [
        'user_id' => $this->member->id, 'period' => '2026-10', 'months' => 3,
    ])->assertSessionHasNoErrors();

    expect(Payment::orderBy('period')->pluck('period')->all())->toBe(['2026-10', '2026-11', '2026-12']);
});

test('the payment page offers up to two years ahead', function () {
    $this->actingAs($this->member)->get('/payments')->assertInertia(fn (Assert $page) => $page
        ->has('payable', 1)
        ->has('payable.0.periods', 24)
        ->where('payable.0.periods.0', 'September 2026'));
});
