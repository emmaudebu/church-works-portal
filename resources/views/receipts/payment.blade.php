<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Receipt {{ $number }}</title>
    <style>
        @page { margin: 0; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1A1A1A; }
        table { border-collapse: collapse; width: 100%; }
        td, th { vertical-align: top; }
        .serif { font-family: DejaVu Serif, serif; }
        .muted { color: #6B635B; }
        .label { font-size: 7px; letter-spacing: 1.4px; text-transform: uppercase; color: #8A7F72; }

        .header { background: #7A1210; color: #FFFFFF; padding: 20px 26px 18px; }
        .header-rule { height: 4px; background: #D4AF37; }
        .header-rule-thin { height: 1px; background: #F1DFA4; margin-top: 2px; }
        .church { font-size: 13px; font-weight: bold; line-height: 1.25; }
        .department { margin-top: 3px; font-size: 7.5px; letter-spacing: 1.6px; text-transform: uppercase; color: #F1DFA4; }
        .title { font-size: 19px; letter-spacing: 5px; color: #D4AF37; text-align: right; }
        .number { margin-top: 4px; font-size: 8.5px; text-align: right; color: #FFFFFF; }

        .watermark { position: absolute; top: 230px; left: 104px; width: 212px; opacity: 0.05; }
        .content { padding: 18px 26px 0; }

        .amount { margin-top: 14px; background: #FBF6E9; border-left: 4px solid #D4AF37; padding: 12px 14px; }
        .amount-figure { font-size: 23px; font-weight: bold; color: #7A1210; margin-top: 3px; }
        .amount-words { margin-top: 3px; font-style: italic; color: #4A433C; }

        .stamp { position: absolute; top: 4px; right: 12px; width: 92px; padding: 6px 0 5px; border: 2.5px solid #1F7A3D; border-radius: 8px; color: #1F7A3D; text-align: center; transform: rotate(-12deg); }
        .stamp-word { font-size: 17px; font-weight: bold; letter-spacing: 4px; }
        .stamp-date { font-size: 6.5px; letter-spacing: 0.6px; margin-top: 1px; }

        .items { margin-top: 16px; }
        .items th { background: #1A1A1A; color: #FFFFFF; font-size: 7px; letter-spacing: 1.2px; text-transform: uppercase; text-align: left; padding: 6px 8px; font-weight: normal; }
        .items td { padding: 8px; border-bottom: 1px solid #E7E1D6; }
        .items .num { text-align: right; white-space: nowrap; }
        .items .total td { border-bottom: none; border-top: 2px solid #D4AF37; font-weight: bold; font-size: 10px; padding-top: 8px; }
        .chip { display: inline-block; margin: 3px 3px 0 0; padding: 1.5px 5px; border-radius: 6px; background: #F4EFE6; color: #4A433C; font-size: 7px; }

        .details { margin-top: 14px; }
        .details td { padding: 3px 0; }
        .details .key { width: 34%; color: #6B635B; }

        .signature { margin-top: 18px; }
        .signature-line { border-top: 1px solid #1A1A1A; width: 150px; padding-top: 4px; }

        .footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 0 26px 16px; text-align: center; }
        .footer-rule { height: 1px; background: #D4AF37; margin-bottom: 8px; }
        .verse { font-style: italic; color: #4A433C; font-size: 8px; }
        .fine { margin-top: 5px; font-size: 6.5px; color: #8A7F72; }
    </style>
</head>
<body>
    <img src="{{ $watermark }}" class="watermark" alt="">

    <div class="header">
        <table>
            <tr>
                <td style="width: 52px;">
                    <img src="{{ $logo }}" alt="" style="width: 44px;">
                </td>
                <td style="vertical-align: middle;">
                    <div class="church serif">{{ $church }}</div>
                    @if ($department)
                        <div class="department">{{ $department }}</div>
                    @endif
                </td>
                <td style="width: 120px; vertical-align: middle;">
                    <div class="title serif">RECEIPT</div>
                    <div class="number">No. {{ $number }}</div>
                </td>
            </tr>
        </table>
    </div>
    <div class="header-rule"></div>
    <div class="header-rule-thin"></div>

    <div class="content">
        <table>
            <tr>
                <td>
                    <div class="label">Received from</div>
                    <div class="serif" style="font-size: 13px; font-weight: bold; margin-top: 3px;">{{ $member['name'] }}</div>
                    <div class="muted" style="margin-top: 2px;">
                        @if ($member['member_id']) Member ID {{ $member['member_id'] }} @endif
                        @if ($member['unit']) · {{ $member['unit'] }} @endif
                    </div>
                </td>
                <td style="width: 140px; text-align: right;">
                    <div class="label">Date paid</div>
                    <div style="margin-top: 3px; font-weight: bold;">{{ $paid_at }}</div>
                </td>
            </tr>
        </table>

        <div style="position: relative;">
            <div class="amount">
                <div class="label">Amount paid</div>
                <div class="amount-figure">{{ $total }}</div>
                <div class="amount-words">{{ $in_words }}</div>
            </div>
            <div class="stamp">
                <div class="stamp-word">PAID</div>
                <div class="stamp-date">{{ strtoupper($method) }}</div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="num" style="text-align: right;">{{ $months ? 'Months' : 'Qty' }}</th>
                    <th class="num" style="text-align: right;">Rate</th>
                    <th class="num" style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>{{ $purpose }}</strong>
                        <div class="muted" style="margin-top: 2px;">{{ $covers }}</div>
                        @if (count($months) > 1)
                            <div>
                                @foreach ($months as $month)
                                    <span class="chip">{{ $month }}</span>
                                @endforeach
                            </div>
                        @endif
                    </td>
                    <td class="num">{{ $quantity }}</td>
                    <td class="num">{{ $rate }}</td>
                    <td class="num">{{ $total }}</td>
                </tr>
                <tr class="total">
                    <td colspan="3">Total paid</td>
                    <td class="num" style="color: #7A1210;">{{ $total }}</td>
                </tr>
            </tbody>
        </table>

        <table class="details">
            <tr>
                <td class="key">Payment method</td>
                <td>{{ $method }}</td>
            </tr>
            <tr>
                <td class="key">Reference</td>
                <td>{{ $reference }}</td>
            </tr>
            <tr>
                <td class="key">{{ $approver ? 'Approved by' : 'Confirmed by' }}</td>
                <td>{{ $approver ? $approver['name'].($approver['office'] ? ', '.$approver['office'] : '') : 'Paystack, automatically' }}</td>
            </tr>
        </table>

        @if ($approver)
            <div class="signature">
                <div class="serif" style="font-size: 11px; font-style: italic; padding-left: 2px;">{{ $approver['name'] }}</div>
                <div class="signature-line">
                    <span class="label">{{ $approver['office'] ?? 'Approved by' }}</span>
                </div>
            </div>
        @endif
    </div>

    <div class="footer">
        <div class="footer-rule"></div>
        <div class="verse">"Every man according as he purposeth in his heart, so let him give." 2 Corinthians 9:7</div>
        <div class="fine">Thank you for your faithfulness. This receipt was issued electronically on {{ $issued_at }} and is valid without a signature.</div>
    </div>
</body>
</html>
