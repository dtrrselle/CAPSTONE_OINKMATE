<?php

header("Content-Type: application/json");

include "../../config/cors.php";
include "../../config/database.php";
include "../../helpers/feeding_helper.php";

// ── Basic input checks ────────────────────────────────────────────────────
if (!isset($_GET['pen_id']) || trim($_GET['pen_id']) === "") {
    echo json_encode([
        "success" => false,
        "message" => "pen_id is required."
    ]);
    exit();
}

$penId = (int) $_GET['pen_id'];

if ($penId <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid pen_id."
    ]);
    exit();
}

// ── Fetch pig pen + its record, joined by pen_id ──────────────────────────
// Prepared statement — prevents SQL injection.
$stmt = mysqli_prepare(
    $conn,
    "SELECT
        pp.pen_id,
        ppr.device_code,
        pp.pen_name,
        pp.description,
        pp.created_at,
        ppr.pig_count,
        ppr.pig_age_at_registration,
        ppr.avg_weight,
        ppr.age_category,
        ppr.updated_at
    FROM pig_pens pp
    LEFT JOIN pig_pen_records ppr
        ON pp.pen_id = ppr.pen_id
    WHERE pp.pen_id = ?
    LIMIT 1"
);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Prepare failed: " . mysqli_error($conn)
    ]);
    exit();
}

mysqli_stmt_bind_param($stmt, "i", $penId);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

if (mysqli_num_rows($result) === 0) {
    mysqli_stmt_close($stmt);
    echo json_encode([
        "success" => false,
        "message" => "Pig pen not found."
    ]);
    exit();
}

$row = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

$pigCount             = $row['pig_count'] !== null ? (int) $row['pig_count'] : null;
$pigAgeAtRegistration = $row['pig_age_at_registration'] !== null ? (int) $row['pig_age_at_registration'] : null;
$avgWeight            = $row['avg_weight'] !== null ? (float) $row['avg_weight'] : null;
$ageCategory          = $row['age_category'];
$createdAt            = $row['created_at'];

// Recommendation Engine — already implemented in helpers/feeding_helper.php.
// We only pass in the raw values and use whatever it returns.
$currentAgeInDays   = calculateCurrentAge($pigAgeAtRegistration, $createdAt);
$growthStage        = determineGrowthStage($currentAgeInDays);
$feedRecommendation = getFeedRecommendation($growthStage);
$currentAge         = $currentAgeInDays . ' Days';

$pigPen = [
    "pen_id"                  => (int) $row['pen_id'],
    "device_code"             => $row['device_code'],
    "pen_name"                => $row['pen_name'],
    "description"             => $row['description'],
    "created_at"              => $createdAt,
    "pig_count"               => $pigCount,
    "pig_age_at_registration" => $pigAgeAtRegistration,
    "avg_weight"              => $avgWeight,
    "age_category"            => $ageCategory,
    "updated_at"              => $row['updated_at'],
    "currentAge"              => $currentAge,
    "growthStage"             => $growthStage,
    "feedType"                => $feedRecommendation['feedType'] ?? null,
    "recommendedFeed"         => $feedRecommendation['recommendedFeed'] ?? null,
    "source"                  => $feedRecommendation['source'] ?? null,
];

echo json_encode([
    "success" => true,
    "pig_pen" => $pigPen
]);

?>