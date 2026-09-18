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
    !isset($data['temperature']) ||
    !isset($data['humidity']) ||
    !isset($data['ammonia'])
) {
    echo json_encode([
        "success" => false,
        "message" => "Required fields are missing."
    ]);
    exit;
}

$device_code = $data['device_code'];
$temperature = $data['temperature'];
$humidity    = $data['humidity'];
$ammonia     = $data['ammonia'];

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

// STEP 4: Retrieve pen_id
$pen_id = $pigPen['pen_id'];

// STEP 5: Insert new environmental log
$insertStmt = $conn->prepare(
    "INSERT INTO environmental_logs (pen_id, device_code, temperature, humidity, ammonia, recorded_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
);

if (!$insertStmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error."
    ]);
    exit;
}

$insertStmt->bind_param("isddd", $pen_id, $device_code, $temperature, $humidity, $ammonia);
$insertSuccess = $insertStmt->execute();
$insertStmt->close();

if (!$insertSuccess) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to upload environmental data."
    ]);
    exit;
}

// STEP 6: Update or insert device status
$checkStatusStmt = $conn->prepare("SELECT device_status_id FROM device_status WHERE device_code = ? LIMIT 1");

if (!$checkStatusStmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error."
    ]);
    exit;
}

$checkStatusStmt->bind_param("s", $device_code);
$checkStatusStmt->execute();
$statusResult = $checkStatusStmt->get_result();
$existingStatus = $statusResult->fetch_assoc();
$checkStatusStmt->close();

if ($existingStatus) {
    $updateStatusStmt = $conn->prepare(
        "UPDATE device_status SET last_seen = CURRENT_TIMESTAMP, status = 'Online' WHERE device_code = ?"
    );
    $updateStatusStmt->bind_param("s", $device_code);
    $updateStatusStmt->execute();
    $updateStatusStmt->close();
} else {
    $insertStatusStmt = $conn->prepare(
        "INSERT INTO device_status (pen_id, device_code, last_seen, status)
         VALUES (?, ?, CURRENT_TIMESTAMP, 'Online')"
    );
    $insertStatusStmt->bind_param("is", $pen_id, $device_code);
    $insertStatusStmt->execute();
    $insertStatusStmt->close();
}

// STEP 7: Return success response
echo json_encode([
    "success" => true,
    "message" => "Environmental data uploaded successfully."
]);