<?php
/**
 * feeding_helper.php
 *
 * Recommendation Engine for OinkMate.
 *
 * Reads Growth Stage age-brackets and feeding guidance from
 * feeding_reference.csv (in the data/ folder) and exposes three
 * functions used by the pig-pens API endpoints:
 *
 *   calculateCurrentAge($pigAgeAtRegistration, $createdAt)
 *   determineGrowthStage($currentAgeInDays)
 *   getFeedRecommendation($growthStage)
 *
 * CSV columns (no "source" column):
 *   min_age_days, max_age_days, growth_stage, feed_type, recommended_feed_per_day
 *
 * Source reference for all recommendations is fixed to "PNS/BAFS 371:2023".
 */

define(
    'FEEDING_REFERENCE_CSV',
    __DIR__ . '/../data/feeding_reference.csv'
);

/** Fixed source reference since the CSV has no source column. */
define('FEEDING_REFERENCE_SOURCE', 'PNS/BAFS 371:2023');

/**
 * Calculates how old (in days) the pigs in a pen are *today*.
 *
 * pig_age_at_registration is how old the pigs were on the day the pen was
 * added. We add the number of days that have passed since pig_pens.created_at
 * to get their current age.
 *
 * @param  int|string|null $pigAgeAtRegistration  Age in days at registration.
 * @param  string|null     $createdAt              pig_pens.created_at (Y-m-d H:i:s).
 * @return int  Current age in days.
 */
function calculateCurrentAge($pigAgeAtRegistration, $createdAt) {
    $pigAgeAtRegistration = (int) $pigAgeAtRegistration;

    try {
        $createdDate = $createdAt ? new DateTime($createdAt) : new DateTime();
    } catch (Exception $e) {
        $createdDate = new DateTime();
    }

    $today = new DateTime();

    // Compare CALENDAR DATES only, not full timestamps. Otherwise a pen
    // registered at e.g. 2026-07-19 20:19:00, checked the next morning at
    // 2026-07-20 08:00:00, would show 0 days elapsed (less than 24 hours
    // have passed) when it should show 1 calendar day elapsed. Truncating
    // both DateTime objects down to midnight removes the time-of-day
    // (and therefore timezone-drift) dependency entirely.
    $createdDateOnly = new DateTime($createdDate->format('Y-m-d'));
    $todayDateOnly    = new DateTime($today->format('Y-m-d'));

    // Days elapsed since the pen was registered (createdDate -> today).
    // Use diff() in a consistent direction so it never goes negative
    // when createdDate is in the past (the normal case).
    $daysSinceRegistration = (int) $createdDateOnly->diff($todayDateOnly)->days;

    return (int) ($pigAgeAtRegistration + $daysSinceRegistration);
}

/**
 * Loads and caches feeding_reference.csv as an array of associative
 * arrays keyed by normalized (trimmed, lowercased) CSV headers:
 * (min_age_days, max_age_days, growth_stage, feed_type, recommended_feed_per_day).
 *
 * Empty and malformed rows are skipped. Missing CSV never crashes.
 */
function loadFeedingReference() {
    static $rows = null;

    if ($rows !== null) {
        return $rows;
    }

    $rows = [];

    if (!file_exists(FEEDING_REFERENCE_CSV) || !is_readable(FEEDING_REFERENCE_CSV)) {
        return $rows;
    }

    $handle = fopen(FEEDING_REFERENCE_CSV, 'r');
    if ($handle === false) {
        return $rows;
    }

    $header = fgetcsv($handle);

    if ($header) {
        // Normalize headers: trim + lowercase so spacing/casing never breaks matching.
        $header = array_map(function ($h) {
            return strtolower(trim($h));
        }, $header);

        while (($line = fgetcsv($handle)) !== false) {
            // Skip completely empty rows (e.g. blank trailing lines).
            if ($line === [null] || $line === false) {
                continue;
            }
            $isBlank = true;
            foreach ($line as $val) {
                if (trim((string) $val) !== '') {
                    $isBlank = false;
                    break;
                }
            }
            if ($isBlank) {
                continue;
            }

            // Skip malformed rows where column count doesn't match header.
            if (count($line) !== count($header)) {
                continue;
            }

            // Trim every value.
            $line = array_map(function ($v) {
                return is_string($v) ? trim($v) : $v;
            }, $line);

            $row = array_combine($header, $line);
            if ($row === false) {
                continue;
            }

            $rows[] = $row;
        }
    }

    fclose($handle);

    return $rows;
}

/**
 * Determines the Growth Stage (e.g. Creep / Pre-Starter / Starter / Grower /
 * Finisher) for a given current age in days, based on the min/max age
 * brackets defined in feeding_reference.csv.
 *
 * @param  int $currentAgeInDays
 * @return string  Growth stage label, or "Unknown" if no bracket matches.
 */
function determineGrowthStage($currentAgeInDays) {
    $currentAgeInDays = (int) $currentAgeInDays;
    $rows = loadFeedingReference();

    foreach ($rows as $row) {
        if (!isset($row['min_age_days'], $row['max_age_days'], $row['growth_stage'])) {
            continue;
        }

        $min = (int) $row['min_age_days'];
        $max = (int) $row['max_age_days'];

        if ($currentAgeInDays >= $min && $currentAgeInDays <= $max) {
            return $row['growth_stage'];
        }
    }

    return 'Unknown';
}

/**
 * Looks up the feed type and recommended feed intake per day for a given
 * Growth Stage. The CSV has no "source" column, so the source is always
 * returned as the fixed reference "PNS/BAFS 371:2023".
 *
 * @param  string $growthStage
 * @return array{feedType: string, recommendedFeed: string, source: string}
 */
function getFeedRecommendation($growthStage) {
    $rows = loadFeedingReference();

    foreach ($rows as $row) {
        if (isset($row['growth_stage']) && strcasecmp($row['growth_stage'], (string) $growthStage) === 0) {
            return [
                'feedType'        => $row['feed_type'] ?? 'Unknown',
                'recommendedFeed' => $row['recommended_feed_per_day'] ?? 'Not Available',
                'source'          => FEEDING_REFERENCE_SOURCE,
            ];
        }
    }

    return [
        'feedType'        => 'Unknown',
        'recommendedFeed' => 'Not Available',
        'source'          => FEEDING_REFERENCE_SOURCE,
    ];
}