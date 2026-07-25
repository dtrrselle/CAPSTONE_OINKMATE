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
// their latest environmental_logs record (if any), using a correlated
// subquery to find the most recent log per pen. Also LEFT JOIN the
// latest feed_levels record per pen the same way, since container
// readings live in their own table.
$stmt = $conn->prepare(
    "SELECT
        p.pen_id,
        p.pen_name,
        e.device_code,
        e.temperature,
        e.humidity,
        e.ammonia,
        e.recorded_at,
        f.container_1 AS feed_level_1,
        f.container_2 AS feed_level_2,
        f.container_3 AS feed_level_3,
        f.overall_level AS overall_level
     FROM pig_pens p
     LEFT JOIN environmental_logs e
        ON e.pen_id = p.pen_id
        AND e.log_id = (
            SELECT log_id
            FROM environmental_logs
            WHERE pen_id = p.pen_id
            ORDER BY recorded_at DESC
            LIMIT 1
        )
     LEFT JOIN feed_levels f
        ON f.pen_id = p.pen_id
        AND f.recorded_at = (
            SELECT MAX(recorded_at)
            FROM feed_levels
            WHERE pen_id = p.pen_id
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

    // Feed levels come from their own latest-record join and may be
    // present even when there is no environmental_logs reading yet
    // (or vice versa), so they are resolved independently.
    $feed_level_1 = $row['feed_level_1'] !== null ? (float)$row['feed_level_1'] : null;
    $feed_level_2 = $row['feed_level_2'] !== null ? (float)$row['feed_level_2'] : null;
    $feed_level_3 = $row['feed_level_3'] !== null ? (float)$row['feed_level_3'] : null;
    $overall_level = $row['overall_level'] !== null ? (float)$row['overall_level'] : null;

    if ($hasReading) {
        $temperature = $row['temperature'] !== null ? (float)$row['temperature'] : null;
        $humidity    = $row['humidity'] !== null ? (float)$row['humidity'] : null;
        $ammonia     = $row['ammonia'] !== null ? (float)$row['ammonia'] : null;

        // STEP 4: Compute sensor statuses
        if ($temperature === null) {
            $temperature_status = "No Data";
        } elseif ($temperature < 18) {
            $temperature_status = "Low";
        } elseif ($temperature <= 32) {
            $temperature_status = "Normal";
        } else {
            $temperature_status = "High";
        }

        if ($humidity === null) {
            $humidity_status = "No Data";
        } elseif ($humidity < 60) {
            $humidity_status = "Low";
        } elseif ($humidity <= 80) {
            $humidity_status = "Normal";
        } else {
            $humidity_status = "High";
        }

        // Ammonia now stores the RAW MQ135 ADC value (not ppm), so the
        // status is computed using raw ADC thresholds. The value itself
        // is returned as-is, with no conversion.
        if ($ammonia === null) {
            $ammonia_status = "No Data";
        } elseif ($ammonia <= 15000) {
            $ammonia_status = "Safe";
        } elseif ($ammonia <= 35000) {
            $ammonia_status = "Warning";
        } else {
            $ammonia_status = "Critical";
        }

        $data[] = [
            "pen_id"             => (int)$row['pen_id'],
            "pen_name"           => $row['pen_name'],
            "device_code"        => $row['device_code'],
            "temperature"        => $temperature,
            "humidity"           => $humidity,
            "ammonia"            => $ammonia,
            "temperature_status" => $temperature_status,
            "humidity_status"    => $humidity_status,
            "ammonia_status"     => $ammonia_status,
            "feed_level_1"       => $feed_level_1,
            "feed_level_2"       => $feed_level_2,
            "feed_level_3"       => $feed_level_3,
            "overall_level"      => $overall_level,
            "last_updated"       => $row['recorded_at']
        ];
    } else {
        // No environmental reading yet for this pig pen
        $data[] = [
            "pen_id"             => (int)$row['pen_id'],
            "pen_name"           => $row['pen_name'],
            "device_code"        => $row['device_code'], // null if no reading exists
            "temperature"        => null,
            "humidity"           => null,
            "ammonia"            => null,
            "temperature_status" => "No Data",
            "humidity_status"    => "No Data",
            "ammonia_status"     => "No Data",
            "feed_level_1"       => $feed_level_1,
            "feed_level_2"       => $feed_level_2,
            "feed_level_3"       => $feed_level_3,
            "overall_level"      => $overall_level,
            "last_updated"       => null
        ];
    }
}

// STEP 5: Return response (empty array if farmer has no pig pens)
echo json_encode([
    "success" => true,
    "data" => $data
]);