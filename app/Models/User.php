<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\CurrentDepartment;
use App\Support\Offices;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use NotificationChannels\WebPush\HasPushSubscriptions;
use Spatie\Permission\Traits\HasRoles;

#[Fillable([
    'department_id', 'member_id', 'full_name', 'gender', 'date_of_birth', 'phone', 'email',
    'address', 'photo', 'unit', 'date_joined', 'foundation_class_done', 'foundation_certificate',
    'wofbi_done', 'wofbi_certificate',
    'password', 'status', 'suspension_reason',
])]
#[Hidden(['password', 'remember_token', 'qr_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasPushSubscriptions, HasRoles, Notifiable;

    /**
     * Give every new user a random token for their QR code.
     */
    protected static function booted(): void
    {
        static::creating(function (User $user) {
            $user->qr_token ??= Str::random(40);
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_of_birth' => 'date',
            'date_joined' => 'date',
            'foundation_class_done' => 'boolean',
            'wofbi_done' => 'boolean',
            'must_change_password' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return HasOne<MemberProfile, $this>
     */
    public function profile(): HasOne
    {
        return $this->hasOne(MemberProfile::class);
    }

    /**
     * @return HasMany<SuspensionLog, $this>
     */
    public function suspensionLogs(): HasMany
    {
        return $this->hasMany(SuspensionLog::class)->latest('id');
    }

    /**
     * Limit a query to the people an admin works with: a department admin sees
     * their own department only, a super admin sees their selected department.
     *
     * @param  Builder<User>  $query
     */
    public function scopeManagedBy(Builder $query, User $admin): void
    {
        $query->withoutRole('super_admin');

        $departmentId = CurrentDepartment::idFor($admin);

        if ($departmentId) {
            $query->where('department_id', $departmentId);
        } elseif (! $admin->hasRole('super_admin')) {
            $query->whereRaw('1 = 0');
        }
    }

    /**
     * Whether this admin works in a department.
     */
    public function canAccessDepartment(int $departmentId): bool
    {
        return $this->hasRole('super_admin')
            || ($this->isOfficer() && $this->department_id === $departmentId);
    }

    /**
     * @return HasMany<Attendance, $this>
     */
    public function attendance(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Whether this admin may see someone's record.
     */
    public function canView(User $member): bool
    {
        if ($this->hasRole('super_admin')) {
            return true;
        }

        return $this->isOfficer()
            && $this->department_id !== null
            && $this->department_id === $member->department_id
            && ! $member->hasRole('super_admin');
    }

    /**
     * Whether this admin may change someone's record. Officers can only act on
     * ordinary members, so they can not suspend or take over a fellow officer.
     */
    public function canManage(User $member): bool
    {
        if ($member->hasRole('super_admin')) {
            return false;
        }

        return $this->hasRole('super_admin')
            || ($this->canView($member) && $this->canDo('manage_members') && ! $member->isOfficer());
    }

    public function photoUrl(): ?string
    {
        return $this->photo ? route('photos.show', ['user' => $this->id, 'v' => substr(md5($this->photo), 0, 8)]) : null;
    }

    /**
     * The next automatic workforce ID, stepping past any that an admin typed by hand.
     */
    public static function nextMemberId(User $user): string
    {
        $number = $user->id;

        do {
            $memberId = 'CW-'.str_pad((string) $number++, 4, '0', STR_PAD_LEFT);
        } while (static::where('member_id', $memberId)->exists());

        return $memberId;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('super_admin') || $this->isOfficer();
    }

    /**
     * Whether this person holds a department office.
     */
    public function isOfficer(): bool
    {
        return $this->hasAnyRole(Offices::roles());
    }

    /**
     * The label of the office held, if any.
     */
    public function office(): ?string
    {
        return Offices::LABELS[$this->getRoleNames()->first(fn (string $role) => isset(Offices::LABELS[$role]))] ?? null;
    }

    /**
     * Whether this person may do something. Super admins can do everything.
     */
    public function canDo(string $permission): bool
    {
        return $this->hasRole('super_admin') || $this->checkPermissionTo($permission);
    }
}
