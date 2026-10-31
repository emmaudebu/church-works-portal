<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['position_id', 'candidate_id', 'voter_hash'])]
#[Hidden(['voter_hash'])]
#[Table('votes', timestamps: false)]
class Vote extends Model {}
