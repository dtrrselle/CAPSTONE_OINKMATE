<?php

require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../helpers/feeding_helper.php';

header('Content-Type: application/json');

$schedule_id = isset($_GET['schedule_id'])
    ? intval($_GET['schedule_id'])
    : 0;

if ($schedule_id <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid schedule_id'
    ]);
    exit;
}

/*
|--------------------------------------------------------------------------
| LOAD SELECTED FEEDING SCHEDULE
|--------------------------------------------------------------------------
*/

$sql = "
SELECT
    fs.schedule_id,
    fs.pen_id,
    fs.feeding_time,
    fs.feed_amount_per_pig,
    fs.total_feed_required,
    fs.feed_per_container,
    fs.status,

    pp.pen_name,
    pp.farmer_id,
    pp.created_at,

    ppr.pig_age_at_registration,
    ppr.avg_weight,
    ppr.updated_at,
    ppr.pig_count

FROM feeding_schedules fs

INNER JOIN pig_pens pp
    ON fs.pen_id = pp.pen_id

LEFT JOIN pig_pen_records ppr
    ON fs.pen_id = ppr.pen_id

WHERE fs.schedule_id = ?

LIMIT 1
";

$stmt = mysqli_prepare($conn, $sql);

if (!$stmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare schedule query'
    ]);
    exit;
}

mysqli_stmt_bind_param($stmt, "i", $schedule_id);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

if (!$result || mysqli_num_rows($result) === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Schedule not found'
    ]);
    exit;
}

$schedule = mysqli_fetch_assoc($result);

$farmer_id = $schedule['farmer_id'];

unset($schedule['farmer_id']);

mysqli_stmt_close($stmt);

/*
|--------------------------------------------------------------------------
| RECOMPUTE FEED VALUES USING THE LATEST PIG COUNT
|--------------------------------------------------------------------------
| feed_amount_per_pig stays editable/as-saved; total_feed_required and
| feed_per_container are always derived fresh from the Pig Pen's current
| headcount instead of the old stored columns.
*/

$pigCountSql = "
SELECT COALESCE(SUM(pig_count), 0) AS pig_count
FROM pig_pen_records
WHERE pen_id = ?
";

$pigCountStmt = mysqli_prepare($conn, $pigCountSql);

if (!$pigCountStmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare pig count query'
    ]);
    exit;
}

mysqli_stmt_bind_param($pigCountStmt, "i", $schedule['pen_id']);
mysqli_stmt_execute($pigCountStmt);

$pigCountResult = mysqli_stmt_get_result($pigCountStmt);
$pigCountRow = mysqli_fetch_assoc($pigCountResult);

mysqli_stmt_close($pigCountStmt);

$latest_pig_count = (int) ($pigCountRow['pig_count'] ?? 0);
$feed_amount_per_pig = (float) $schedule['feed_amount_per_pig'];

$schedule['total_feed_required'] = $latest_pig_count * $feed_amount_per_pig;
$schedule['feed_per_container'] = $schedule['total_feed_required'] / 3;

/*
|--------------------------------------------------------------------------
| RECOMMENDATION ENGINE (feeding_helper.php)
|--------------------------------------------------------------------------
| currentAge / growthStage / feedType / recommendedFeed / source are all
| derived from pig_age_at_registration + updated_at via feeding_helper.php.
| No recommendation logic is duplicated here. These are appended on top of
| the existing schedule fields — the rest of the JSON structure is untouched.
*/

$currentAge = calculateCurrentAge($schedule['pig_age_at_registration'], $schedule['created_at']);
$growthStage = determineGrowthStage($currentAge);
$recommendation = getFeedRecommendation($growthStage);

$schedule['currentAge'] = $currentAge;
$schedule['growthStage'] = $growthStage;
$schedule['feedType'] = $recommendation['feedType'];
$schedule['recommendedFeed'] = $recommendation['recommendedFeed'];
$schedule['source'] = $recommendation['source'];

/*
|--------------------------------------------------------------------------
| LOAD AVAILABLE PIG PENS OF THE SAME FARMER
|--------------------------------------------------------------------------
*/

$penSql = "
SELECT
    pp.pen_id,
    pp.pen_name,
    pp.created_at,
    ppr.pig_age_at_registration,
    ppr.updated_at,
    ppr.pig_count

FROM pig_pens pp

LEFT JOIN pig_pen_records ppr
    ON pp.pen_id = ppr.pen_id

WHERE pp.farmer_id = ?

ORDER BY pp.pen_name ASC
";

$penStmt = mysqli_prepare($conn, $penSql);

if (!$penStmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare pig pen query'
    ]);
    exit;
}

mysqli_stmt_bind_param($penStmt, "i", $farmer_id);
mysqli_stmt_execute($penStmt);

$penResult = mysqli_stmt_get_result($penStmt);

$available_pens = [];

while ($row = mysqli_fetch_assoc($penResult)) {
    // Same recommendation engine, applied per pen — no duplicated logic.
    $penCurrentAge = calculateCurrentAge($row['pig_age_at_registration'], $row['created_at']);
    $penGrowthStage = determineGrowthStage($penCurrentAge);
    $penRecommendation = getFeedRecommendation($penGrowthStage);

    $row['currentAge'] = $penCurrentAge;
    $row['growthStage'] = $penGrowthStage;
    $row['feedType'] = $penRecommendation['feedType'];
    $row['recommendedFeed'] = $penRecommendation['recommendedFeed'];
    $row['source'] = $penRecommendation['source'];

    // updated_at / created_at were only needed internally to compute
    // currentAge; they aren't part of the available_pens output shape.
    unset($row['updated_at']);
    unset($row['created_at']);

    $available_pens[] = $row;
}

mysqli_stmt_close($penStmt);

echo json_encode([
    'success' => true,
    'schedule' => $schedule,
    'available_pens' => $available_pens
]);

mysqli_close($conn);

?>