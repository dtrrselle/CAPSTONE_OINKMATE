<?php
require_once '../../../config/cors.php';
require_once '../../../config/database.php';

header('Content-Type: application/json');

// STEP 1: Validate farmer_id
if (!isset($_GET['farmer_id']) || $_GET['farmer_id'] === '') {
    echo json_encode([
        "success" => false,
        "message" => "farmer_id is required."
    ]);
    exit;
}

$farmer_id = $_GET['farmer_id'];

// STEP 2 & 3: Retrieve all pig pens owned by the farmer along with
// their latest feed_levels record (if any), using a correlated
// subquery to find the most recent reading per pen.
$stmt = $conn->prepare(
    "SELECT
        p.pen_id,
        p.pen_name,
        f.device_code,
        f.container_1,
        f.container_2,
        f.container_3,
        f.overall_level,
        f.recorded_at
     FROM pig_pens p
     LEFT JOIN feed_levels f
        ON f.pen_id = p.pen_id
        AND f.feed_level_id = (
            SELECT feed_level_id
            FROM feed_levels
            WHERE pen_id = p.pen_id
            ORDER BY recorded_at DESC
            LIMIT 1
        )
     WHERE p.farmer_id = ?"
);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error."
    ]);
    exit;
}

$stmt->bind_param("i", $farmer_id);
$stmt->execute();
$result = $stmt->get_result();
$rows = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$data = [];

foreach ($rows as $row) {
    $hasReading = ($row['recorded_at'] !== null);

    if ($hasReading) {
        $container_1   = $row['container_1'] !== null ? (float)$row['container_1'] : null;
        $container_2   = $row['container_2'] !== null ? (float)$row['container_2'] : null;
        $container_3   = $row['container_3'] !== null ? (float)$row['container_3'] : null;
        $overall_level = $row['overall_level'] !== null ? (float)$row['overall_level'] : null;

        // STEP 4: Determine feed status using overall_level
        if ($overall_level === null) {
            $feed_status = "No Data";
        } elseif ($overall_level >= 80) {
            $feed_status = "Full";
        } elseif ($overall_level >= 50) {
            $feed_status = "Medium";
        } elseif ($overall_level >= 20) {
            $feed_status = "Low";
        } else {
            $feed_status = "Critical";
        }

        $data[] = [
            "pen_id"        => (int)$row['pen_id'],
            "pen_name"      => $row['pen_name'],
            "device_code"   => $row['device_code'],
            "container_1"   => $container_1,
            "container_2"   => $container_2,
            "container_3"   => $container_3,
            "overall_level" => $overall_level,
            "feed_status"   => $feed_status,
            "last_updated"  => $row['recorded_at']
        ];
    } else {
        // No feed level reading yet for this pig pen
        $data[] = [
            "pen_id"        => (int)$row['pen_id'],
            "pen_name"      => $row['pen_name'],
            "device_code"   => $row['device_code'], // null if no reading exists
            "container_1"   => null,
            "container_2"   => null,
            "container_3"   => null,
            "overall_level" => null,
            "feed_status"   => "No Data",
            "last_updated"  => null
        ];
    }
}

// STEP 5: Return response (empty array if farmer has no pig pens)
echo json_encode([
    "success" => true,
    "data" => $data
]);