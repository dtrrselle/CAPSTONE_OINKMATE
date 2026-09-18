<?php
require_once '../../../config/cors.php';
require_once '../../../config/database.php';

header('Content-Type: application/json');

// STEP 1: Read and decode JSON request body
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

// STEP 2: Validate required fields
if (
    !isset($data['device_code']) ||
    !isset($data['container_1']) ||
    !isset($data['container_2']) ||
    !isset($data['container_3'])
) {
    echo json_encode([
        "success" => false,
        "message" => "Required fields are missing."
    ]);
    exit;
}

$device_code = $data['device_code'];
$container_1 = $data['container_1'];
$container_2 = $data['container_2'];
$container_3 = $data['container_3'];

// STEP 3: Validate device_code against pig_pen_records
$stmt = $conn->prepare("SELECT pen_id FROM pig_pen_records WHERE device_code = ? LIMIT 1");

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error."
    ]);
    exit;
}

$stmt->bind_param("s", $device_code);
$stmt->execute();
$result = $stmt->get_result();
$pigPen = $result->fetch_assoc();
$stmt->close();

if (!$pigPen) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid device code."
    ]);
    exit;
}

$pen_id = $pigPen['pen_id'];

// STEP 4: Compute overall_level
$overall_level = ($container_1 + $container_2 + $container_3) / 3;

// STEP 5: Insert into feed_levels
$insertStmt = $conn->prepare(
    "INSERT INTO feed_levels (pen_id, device_code, container_1, container_2, container_3, overall_level, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
);

if (!$insertStmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error."
    ]);
    exit;
}

$insertStmt->bind_param(
    "isdddd",
    $pen_id,
    $device_code,
    $container_1,
    $container_2,
    $container_3,
    $overall_level
);

$insertSuccess = $insertStmt->execute();
$insertStmt->close();

if (!$insertSuccess) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to upload feed levels."
    ]);
    exit;
}

// STEP 6: Return success response
echo json_encode([
    "success" => true,
    "message" => "Feed levels uploaded successfully."
]);