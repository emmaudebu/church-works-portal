<?php

use App\Models\Candidate;
use App\Models\Department;
use App\Models\Election;
use App\Models\Position;
use App\Models\User;
use App\Models\Vote;
use App\Support\Ballot;
use App\Support\CurrentDepartment;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $this->technical = Department::firstWhere('slug', 'technical-unit');
    $this->choir = Department::firstWhere('slug', 'choir');

    $this->admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $this->outsider = User::factory()->create(['department_id' => $this->choir->id])->assignRole('member');

    $this->election = Election::factory()->create(['department_id' => $this->technical->id]);

    $this->head = $this->election->positions()->create(['title' => 'Head']);
    $this->deputy = $this->election->positions()->create(['title' => 'Deputy']);

    $this->ada = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $this->bola = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->headAda = $this->head->candidates()->create(['user_id' => $this->ada->id]);
    $this->headBola = $this->head->candidates()->create(['user_id' => $this->bola->id]);
    $this->deputyAda = $this->deputy->candidates()->create(['user_id' => $this->ada->id]);

    $this->choices = [$this->head->id => $this->headAda->id, $this->deputy->id => $this->deputyAda->id];
});

function castVote(object $test, ?User $voter = null, ?array $choices = null, ?Election $election = null)
{
    return $test->actingAs($voter ?? $test->member)
        ->post(route('member.elections.vote', $election ?? $test->election), ['choices' => $choices ?? $test->choices]);
}

test('a member can vote once for each position', function () {
    castVote($this)->assertRedirect(route('member.elections', absolute: false))
        ->assertSessionHas('success', 'Thank you for voting.');

    expect(Vote::count())->toBe(2)
        ->and(Vote::where('candidate_id', $this->headAda->id)->count())->toBe(1);
});

test('a second ballot is refused and changes nothing', function () {
    castVote($this);

    castVote($this, choices: [$this->head->id => $this->headBola->id, $this->deputy->id => $this->deputyAda->id])
        ->assertSessionHasErrors('ballot');

    expect(Vote::count())->toBe(2)
        ->and(Vote::where('candidate_id', $this->headBola->id)->count())->toBe(0);
});

test('the database itself refuses a second vote on a position', function () {
    $key = ['position_id' => $this->head->id, 'voter_hash' => Ballot::voterHash($this->member, $this->head->id)];

    Vote::create([...$key, 'candidate_id' => $this->headAda->id]);

    expect(fn () => Vote::create([...$key, 'candidate_id' => $this->headBola->id]))
        ->toThrow(UniqueConstraintViolationException::class);
});

test('a partly refused ballot saves nothing', function () {
    castVote($this, choices: [$this->head->id => $this->headAda->id])->assertSessionHasErrors('ballot');

    expect(Vote::count())->toBe(0);
});

test('a candidate from another position is refused', function () {
    castVote($this, choices: [$this->head->id => $this->deputyAda->id, $this->deputy->id => $this->deputyAda->id])
        ->assertSessionHasErrors('ballot');

    expect(Vote::count())->toBe(0);
});

test('a suspended member can not vote', function () {
    $this->member->update(['status' => 'suspended']);

    expect(Ballot::isEligible($this->election, $this->member))->toBeFalse();
    expect(fn () => Ballot::cast($this->election, $this->member, $this->choices))
        ->toThrow(ValidationException::class);

    castVote($this);

    expect(Vote::count())->toBe(0);
    $this->assertGuest();
});

test('a suspended candidate leaves the ballot and can not receive votes', function () {
    $this->bola->update(['status' => 'suspended']);

    $this->actingAs($this->member)->get(route('member.elections.show', $this->election))
        ->assertInertia(fn (Assert $page) => $page->has('positions.0.candidates', 1));

    castVote($this, choices: [$this->head->id => $this->headBola->id, $this->deputy->id => $this->deputyAda->id])
        ->assertSessionHasErrors('ballot');
});

test('voting is refused before it opens and after it closes', function (string $state) {
    $election = Election::factory()->{$state}()->create(['department_id' => $this->technical->id]);
    $position = $election->positions()->create(['title' => 'P']);
    $candidate = $position->candidates()->create(['user_id' => $this->ada->id]);

    castVote($this, choices: [$position->id => $candidate->id], election: $election)
        ->assertSessionHasErrors('ballot');

    expect(Vote::count())->toBe(0);
})->with(['upcoming', 'closed']);

test('members of other departments can not see or vote in an election', function () {
    $this->actingAs($this->outsider)->get(route('member.elections.show', $this->election))->assertNotFound();
    castVote($this, $this->outsider)->assertNotFound();

    expect(Vote::count())->toBe(0);
});

test('votes can not be linked to a voter', function () {
    expect(Schema::getColumnListing('votes'))->toEqualCanonicalizing(['id', 'position_id', 'candidate_id', 'voter_hash']);

    castVote($this);

    $hashes = Vote::pluck('voter_hash');

    expect($hashes->unique())->toHaveCount(2)
        ->and($hashes)->not->toContain((string) $this->member->id)
        ->and($hashes)->not->toContain(hash('sha256', "{$this->head->id}:{$this->member->id}"));
});

test('two members get different hashes on the same position', function () {
    expect(Ballot::voterHash($this->member, $this->head->id))
        ->not->toBe(Ballot::voterHash($this->ada, $this->head->id));
});

test('the admin never receives vote hashes or voter identities', function () {
    castVote($this);

    $this->actingAs($this->admin)->get(route('admin.elections.show', $this->election))
        ->assertDontSee(Vote::first()->getRawOriginal('voter_hash'));
});

test('results stay hidden from members until published', function () {
    castVote($this);

    $this->actingAs($this->member)->get(route('member.elections.results', $this->election))->assertNotFound();

    $this->actingAs($this->admin)->get(route('admin.elections.show', $this->election))
        ->assertInertia(fn (Assert $page) => $page
            ->where('results.0.total', 1)
            ->where('results.0.candidates.0.votes', 1)
            ->where('turnout.voted', 1));
});

test('publishing results shows them to members and hiding removes them', function () {
    castVote($this);

    $this->actingAs($this->admin)
        ->patch(route('admin.elections.results', $this->election), ['results_public' => true])
        ->assertRedirect();

    $this->actingAs($this->member)->get(route('member.elections.results', $this->election))
        ->assertInertia(fn (Assert $page) => $page->component('Member/Elections/Results')->where('results.0.total', 1));

    $this->actingAs($this->admin)
        ->patch(route('admin.elections.results', $this->election), ['results_public' => false]);

    $this->actingAs($this->member)->get(route('member.elections.results', $this->election))->assertNotFound();
});

test('published results stay inside the department', function () {
    $this->election->update(['results_public' => true]);

    $this->actingAs($this->outsider)->get(route('member.elections.results', $this->election))->assertNotFound();
});

test('members can not publish results or manage elections', function () {
    $this->actingAs($this->member)
        ->patch(route('admin.elections.results', $this->election), ['results_public' => true])
        ->assertForbidden();
    $this->actingAs($this->member)->get(route('admin.elections.show', $this->election))->assertForbidden();

    expect($this->election->fresh()->results_public)->toBeFalse();
});

test('a department admin can not manage another department election', function () {
    $election = Election::factory()->create(['department_id' => $this->choir->id]);

    $this->actingAs($this->admin)->get(route('admin.elections.show', $election))->assertNotFound();
    $this->actingAs($this->admin)->post(route('admin.elections.close', $election))->assertNotFound();
    $this->actingAs($this->admin)->patch(route('admin.elections.results', $election), ['results_public' => true])->assertNotFound();
    $this->actingAs($this->admin)->delete(route('admin.elections.destroy', $election))->assertNotFound();
});

test('an admin can set up an election before it starts', function () {
    $this->actingAs($this->admin)->post(route('admin.elections.store'), [
        'title' => 'New', 'starts_at' => now()->addDay()->toDateTimeString(), 'ends_at' => now()->addDays(2)->toDateTimeString(),
    ])->assertSessionHasNoErrors();

    $election = Election::firstWhere('title', 'New');

    expect($election->department_id)->toBe($this->technical->id);

    $this->actingAs($this->admin)->post(route('admin.positions.store', $election), ['title' => 'Head']);

    $position = Position::firstWhere('election_id', $election->id);

    $this->actingAs($this->admin)
        ->post(route('admin.candidates.store', $position), ['user_id' => $this->ada->id, 'manifesto' => 'Serve'])
        ->assertSessionHasNoErrors();

    expect($position->candidates)->toHaveCount(1);
});

test('closing must come after opening', function () {
    $this->actingAs($this->admin)->post(route('admin.elections.store'), [
        'title' => 'Bad', 'starts_at' => now()->addDays(2)->toDateTimeString(), 'ends_at' => now()->addDay()->toDateTimeString(),
    ])->assertSessionHasErrors('ends_at');
});

test('a super admin must pick a department before creating an election', function () {
    $superAdmin = User::factory()->create()->assignRole('super_admin');

    $payload = ['title' => 'X', 'starts_at' => now()->addDay()->toDateTimeString(), 'ends_at' => now()->addDays(2)->toDateTimeString()];

    $this->actingAs($superAdmin)->post(route('admin.elections.store'), $payload)->assertStatus(422);

    $this->actingAs($superAdmin)
        ->withSession([CurrentDepartment::SESSION_KEY => $this->technical->id])
        ->post(route('admin.elections.store'), $payload)
        ->assertSessionHasNoErrors();
});

test('candidates must be active members of the department and stand once', function () {
    $election = Election::factory()->upcoming()->create(['department_id' => $this->technical->id]);
    $position = $election->positions()->create(['title' => 'P']);
    $suspended = User::factory()->suspended()->create(['department_id' => $this->technical->id]);

    foreach ([$this->outsider, $suspended] as $user) {
        $this->actingAs($this->admin)->post(route('admin.candidates.store', $position), ['user_id' => $user->id])
            ->assertSessionHasErrors('user_id');
    }

    $position->candidates()->create(['user_id' => $this->ada->id]);

    $this->actingAs($this->admin)->post(route('admin.candidates.store', $position), ['user_id' => $this->ada->id])
        ->assertSessionHasErrors('user_id');
});

test('the ballot is frozen once voting has started', function () {
    $this->actingAs($this->admin)->post(route('admin.positions.store', $this->election), ['title' => 'Late'])->assertStatus(422);
    $this->actingAs($this->admin)->delete(route('admin.positions.destroy', $this->head))->assertStatus(422);
    $this->actingAs($this->admin)->post(route('admin.candidates.store', $this->head), ['user_id' => $this->member->id])->assertStatus(422);
    $this->actingAs($this->admin)->delete(route('admin.candidates.destroy', $this->headBola))->assertStatus(422);

    expect($this->election->positions()->count())->toBe(2)
        ->and(Candidate::count())->toBe(3);
});

test('once started only the closing time can be changed', function () {
    $start = $this->election->starts_at->toDateTimeString();

    $this->actingAs($this->admin)->patch(route('admin.elections.update', $this->election), [
        'title' => 'Renamed', 'starts_at' => now()->addDay()->toDateTimeString(), 'ends_at' => now()->addDays(3)->toDateTimeString(),
    ])->assertSessionHasNoErrors();

    $election = $this->election->fresh();

    expect($election->title)->toBe('Unit Leadership Election')
        ->and($election->starts_at->toDateTimeString())->toBe($start)
        ->and($election->ends_at->isAfter(now()->addDays(2)))->toBeTrue();
});

test('a closed election can not be reopened', function () {
    $election = Election::factory()->closed()->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->admin)
        ->patch(route('admin.elections.update', $election), ['ends_at' => now()->addDay()->toDateTimeString()])
        ->assertSessionHasErrors('ends_at');
});

test('closing voting early stops new ballots', function () {
    $this->actingAs($this->admin)->post(route('admin.elections.close', $this->election))->assertRedirect();

    $this->travel(1)->seconds();

    castVote($this)->assertSessionHasErrors('ballot');
});

test('an election with votes can not be deleted', function () {
    castVote($this);

    $this->actingAs($this->admin)->delete(route('admin.elections.destroy', $this->election))->assertStatus(422);

    expect(Election::find($this->election->id))->not->toBeNull();
});

test('an election without votes can be deleted', function () {
    $this->actingAs($this->admin)->delete(route('admin.elections.destroy', $this->election))->assertRedirect();

    expect(Election::find($this->election->id))->toBeNull();
});

test('the list shows whether the member has voted without saying how', function () {
    castVote($this);

    $this->actingAs($this->member)->get('/elections')->assertInertia(fn (Assert $page) => $page
        ->where('elections.0.has_voted', true)
        ->missing('elections.0.choice'));

    $this->actingAs($this->member)->get(route('member.elections.show', $this->election))
        ->assertRedirect(route('member.elections', absolute: false));
});

test('the home screen invites a member who has not voted', function () {
    $this->actingAs($this->member)->get('/home')
        ->assertInertia(fn (Assert $page) => $page->where('openElection.id', $this->election->id));

    castVote($this);

    $this->actingAs($this->member)->get('/home')
        ->assertInertia(fn (Assert $page) => $page->where('openElection', null));
});

test('turnout counts voters against active members', function () {
    castVote($this);
    castVote($this, $this->ada);

    expect(Ballot::turnout($this->election))->toBe(['voted' => 2, 'eligible' => 4, 'percent' => 50]);
});

test('candidate photos are limited to the department', function () {
    $this->actingAs($this->outsider)->get(route('candidates.photo', $this->headAda))->assertForbidden();
    $this->actingAs($this->member)->get(route('candidates.photo', $this->headAda))->assertNotFound();
});
