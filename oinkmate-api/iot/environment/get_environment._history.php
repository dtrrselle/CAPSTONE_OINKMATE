<?php
require_once '../../../config/cors.php';
require_once '../../../config/database.php';

header('Content-Type: application/json');

// STEP 1: Validate pen_id
if (!isset($_GET['pen_id']) || $_GET['pen_id'] === '') {
    echo json_encode([
        "success" => false,
        "message" => "pen_id is required."
    ]);
    exit;
}

$pen_id = $_GET['pen_id'];

// STEP 2: Retrieve all environmental_logs readings for this pen,
// ordered oldest -> newest (good for charts/graphs of history over time)
$stmt = $conn->prepare(
    "SELECT
        log_id,
        pen_id,
        device_code,
        temperature,
        humidity,
        ammonia,
        recorded_at
     FROM environmental_logs
     WHERE pen_id = ?
     ORDER BY recorded_at ASC"
);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error."
    ]);
    exit;
}

$stmt->bind_param("i", $pen_id);
$stmt->execute();
$result = $stmt->get_result();
$rows = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$data = [];

foreach ($rows as $row) {
    $temperature = $row['temperature'] !== null ? (float)$row['temperature'] : null;
    $humidity    = $row['humidity'] !== null ? (float)$row['humidity'] : null;
    $ammonia     = $row['ammonia'] !== null ? (float)$row['ammonia'] : null;

    // Compute sensor statuses (same thresholds used in get_latest_environment.php)
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

    if ($ammonia === null) {
        $ammonia_status = "No Data";
    } elseif ($ammonia <= 10) {
        $ammonia_status = "Safe";
    } elseif ($ammonia <= 20) {
        $ammonia_status = "Warning";
    } else {
        $ammonia_status = "Critical";
    }

    $data[] = [
        "log_id"             => (int)$row['log_id'],
        "pen_id"             => (int)$row['pen_id'],
        "device_code"        => $row['device_code'],
        "temperature"        => $temperature,
        "humidity"           => $humidity,
        "ammonia"            => $ammonia,
        "temperature_status" => $temperature_status,
        "humidity_status"    => $humidity_status,
        "ammonia_status"     => $ammonia_status,
        "recorded_at"        => $row['recorded_at']
    ];
}

// STEP 3: Return response (empty array if pen has no readings yet)
echo json_encode([
    "success" => true,
    "pen_id" => (int)$pen_id,
    "data" => $data
]);