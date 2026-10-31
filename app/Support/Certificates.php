<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Class certificates are personal documents, so they live on the private disk.
 */
class Certificates
{
    /**
     * Each certificate and the yes/no answer it proves.
     */
    public const FIELDS = [
        'foundation_certificate' => 'foundation_class_done',
        'wofbi_certificate' => 'wofbi_done',
    ];

    public const TYPES = ['foundation' => 'foundation_certificate', 'wofbi' => 'wofbi_certificate'];

    /**
     * Swap uploaded files in the validated data for stored paths, and remove a
     * certificate when its class is changed back to "no".
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function apply(Request $request, array $data, ?User $user = null): array
    {
        foreach (self::FIELDS as $field => $answer) {
            unset($data[$field]);

            $answeredNo = array_key_exists($answer, $data) && ! $data[$answer];

            if ($request->hasFile($field) && ! $answeredNo) {
                $data[$field] = PrivateDocument::store($request->file($field), 'certificates', $user?->{$field});
            } elseif ($user?->{$field} && $answeredNo) {
                Storage::disk('local')->delete($user->{$field});
                $data[$field] = null;
            }
        }

        return $data;
    }

    /**
     * Addresses for a member's certificates, null where none is uploaded.
     *
     * @return array<string, string|null>
     */
    public static function urls(User $user): array
    {
        return collect(self::TYPES)
            ->map(fn (string $field, string $type) => $user->{$field}
                ? route('certificates.show', ['user' => $user->id, 'type' => $type])
                : null)
            ->all();
    }
}
