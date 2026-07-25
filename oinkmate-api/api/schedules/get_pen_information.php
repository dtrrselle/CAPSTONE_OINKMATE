<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../helpers/feeding_helper.php';

header('Content-Type: application/json');

// Accept pen_id from either GET (query string) or POST (form body).
$pen_id = $_GET['pen_id'] ?? $_POST['pen_id'] ?? null;

if (!$pen_id) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'pen_id is required'
    ]);
    exit;
}

try {
    $stmt = $conn->prepare(
        "SELECT ppr.pig_count, ppr.pig_age_at_registration, ppr.avg_weight, pp.created_at
         FROM pig_pen_records ppr
         INNER JOIN pig_pens pp ON ppr.pen_id = pp.pen_id
         WHERE ppr.pen_id = ?
         LIMIT 1"
    );

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param('i', $pen_id);
    $stmt->execute();

    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    $stmt->close();

    if (!$row) {
        echo json_encode([
            'success' => false,
            'message' => 'No pig pen record found for this pen_id'
        ]);
        exit;
    }

    /*
    |--------------------------------------------------------------------------
    | RECOMMENDATION ENGINE (feeding_helper.php)
    |--------------------------------------------------------------------------
    | currentAge / growthStage / feedType / recommendedFeed / source are all
    | derived from pig_age_at_registration + updated_at via feeding_helper.php.
    | No recommendation logic is duplicated here.
    */
    $currentAge = calculateCurrentAge($row['pig_age_at_registration'], $row['created_at']);
    $growthStage = determineGrowthStage($currentAge);
    $recommendation = getFeedRecommendation($growthStage);

    echo json_encode([
        'success' => true,
        'pig_count' => (int) $row['pig_count'],
        'pig_age_at_registration' => $row['pig_age_at_registration'],
        'avg_weight' => $row['avg_weight'],
        'currentAge' => $currentAge,
        'growthStage' => $growthStage,
        'feedType' => $recommendation['feedType'],
        'recommendedFeed' => $recommendation['recommendedFeed'],
        'source' => $recommendation['source']
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load pig pen information',
        'error' => $e->getMessage()
    ]);
}

$conn->close();