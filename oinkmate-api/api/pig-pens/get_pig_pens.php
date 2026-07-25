<?php

header("Content-Type: application/json");

include "../../config/cors.php";
include "../../config/database.php";
include "../../helpers/feeding_helper.php";

// Read and decode JSON input
$rawData = file_get_contents("php://input");
$data    = json_decode($rawData);

// ── Basic input checks ────────────────────────────────────────────────────
if (!$data || !isset($data->farmer_id)) {
    echo json_encode([
        "success" => false,
        "message" => "farmer_id is required."
    ]);
    exit();
}

$farmerId = (int) $data->farmer_id;

if ($farmerId <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid farmer_id."
    ]);
    exit();
}

// ── Fetch pig pens + their latest record, joined by pen_id ───────────────
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
        ppr.avg_weight
    FROM pig_pens pp
    LEFT JOIN pig_pen_records ppr
        ON pp.pen_id = ppr.pen_id
    WHERE pp.farmer_id = ?
    ORDER BY pp.created_at DESC"
);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Prepare failed: " . mysqli_error($conn)
    ]);
    exit();
}

mysqli_stmt_bind_param($stmt, "i", $farmerId);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

$pigPens = [];
while ($row = mysqli_fetch_assoc($result)) {
    $pigCount             = $row['pig_count'] !== null ? (int) $row['pig_count'] : null;
    $pigAgeAtRegistration = $row['pig_age_at_registration'] !== null ? (int) $row['pig_age_at_registration'] : null;
    $avgWeight            = $row['avg_weight'] !== null ? (float) $row['avg_weight'] : null;
    $createdAt            = $row['created_at'];

    // Recommendation Engine — already implemented in helpers/feeding_helper.php.
    // We only pass in the raw values and use whatever it returns.
    $currentAgeInDays   = calculateCurrentAge($pigAgeAtRegistration, $createdAt);
    $growthStage        = determineGrowthStage($currentAgeInDays);
    $feedRecommendation = getFeedRecommendation($growthStage);
    $currentAge         = $currentAgeInDays . ' Days';

    $pigPens[] = [
        "pen_id"                   => (int) $row['pen_id'],
        "device_code"               => $row['device_code'],
        "pen_name"                  => $row['pen_name'],
        "description"               => $row['description'],
        "created_at"                => $createdAt,
        "pig_count"                 => $pigCount,
        "pig_age_at_registration"   => $pigAgeAtRegistration,
        "avg_weight"                => $avgWeight,
        "currentAge"                => $currentAge,
        "growthStage"               => $growthStage,
        "feedType"                  => $feedRecommendation['feedType'] ?? null,
        "recommendedFeed"           => $feedRecommendation['recommendedFeed'] ?? null,
        "source"                    => $feedRecommendation['source'] ?? null,
    ];
}

mysqli_stmt_close($stmt);

echo json_encode([
    "success"  => true,
    "pig_pens" => $pigPens
]);

?>