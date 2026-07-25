<?php
include "../../config/cors.php";
include "../../config/database.php";
include "../../helpers/feeding_helper.php";

header('Content-Type: application/json');

// Make mysqli throw exceptions on failure so our try/catch below can
// catch real DB errors instead of silently continuing.
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$response = ['success' => false];

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $response['error_code'] = 'INVALID_REQUEST';
    $response['message'] = 'Invalid request payload.';
    echo json_encode($response);
    exit;
}

$pen_id       = isset($input['pen_id']) ? (int) $input['pen_id'] : 0;
$farmer_id    = isset($input['farmer_id']) ? (int) $input['farmer_id'] : 0;
$device_code  = isset($input['device_code']) ? trim($input['device_code']) : '';
$pen_name     = isset($input['pen_name']) ? trim($input['pen_name']) : '';
$description  = isset($input['description']) ? trim($input['description']) : '';
$pig_count    = isset($input['pig_count']) ? (int) $input['pig_count'] : 0;
$avg_weight   = isset($input['avg_weight']) ? (float) $input['avg_weight'] : 0;
$pig_age_at_registration = isset($input['pig_age_at_registration']) ? (int) $input['pig_age_at_registration'] : 0;

if ($pen_id <= 0 || $farmer_id <= 0 || $device_code === '' || $pen_name === '' || $pig_age_at_registration <= 0) {
    $response['error_code'] = 'INVALID_REQUEST';
    $response['message'] = 'Missing required fields.';
    echo json_encode($response);
    exit;
}

// Growth Stage (age_category) is derived from feeding_reference.csv
// brackets via feeding_helper.php, exactly like add_pig_pen.php - it is
// never accepted from the client.
$age_category = determineGrowthStage($pig_age_at_registration);

// ------------------------------------------------------------------
// 1. Load the current pig pen (must belong to this farmer)
// ------------------------------------------------------------------
$stmt = $conn->prepare(
    'SELECT r.device_code, p.pen_name
     FROM pig_pens p
     JOIN pig_pen_records r ON r.pen_id = p.pen_id
     WHERE p.pen_id = ? AND p.farmer_id = ? LIMIT 1'
);
$stmt->bind_param('ii', $pen_id, $farmer_id);
$stmt->execute();
$currentPen = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$currentPen) {
    $response['error_code'] = 'PEN_NOT_FOUND';
    $response['message'] = 'Pig pen not found.';
    echo json_encode($response);
    exit;
}

$currentDeviceCode = $currentPen['device_code'];
$currentPenName    = $currentPen['pen_name'];

// ------------------------------------------------------------------
// 2. Duplicate pen name check (only if the name actually changed)
// ------------------------------------------------------------------
if (strcasecmp($pen_name, $currentPenName) !== 0) {
    $stmt = $conn->prepare('SELECT pen_id FROM pig_pens WHERE farmer_id = ? AND pen_name = ? AND pen_id != ? LIMIT 1');
    $stmt->bind_param('isi', $farmer_id, $pen_name, $pen_id);
    $stmt->execute();
    $duplicate = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($duplicate) {
        $response['error_code'] = 'DUPLICATE_NAME';
        $response['message'] = 'A pig pen with this name already exists.';
        echo json_encode($response);
        exit;
    }
}

// ------------------------------------------------------------------
// 3. Device code validation (only if the device code actually changed)
// ------------------------------------------------------------------
$deviceChanged = (strcasecmp($device_code, $currentDeviceCode) !== 0);

if ($deviceChanged) {
    $stmt = $conn->prepare('SELECT device_id, device_status FROM devices WHERE device_code = ? LIMIT 1');
    $stmt->bind_param('s', $device_code);
    $stmt->execute();
    $device = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$device) {
        $response['error_code'] = 'INVALID_DEVICE_CODE';
        $response['message'] = 'The entered device code does not exist.';
        echo json_encode($response);
        exit;
    }

    if ($device['device_status'] === 'assigned') {
        $response['error_code'] = 'DEVICE_ASSIGNED';
        $response['message'] = 'This device code is already assigned to another pig pen.';
        echo json_encode($response);
        exit;
    }
}

// ------------------------------------------------------------------
// 4. Apply the update inside a transaction
// ------------------------------------------------------------------
$conn->begin_transaction();

try {
    // pig_pens - device_code no longer lives here, only pen_name/description
    $stmt = $conn->prepare('UPDATE pig_pens SET pen_name = ?, description = ? WHERE pen_id = ? AND farmer_id = ?');
    $stmt->bind_param('ssii', $pen_name, $description, $pen_id, $farmer_id);
    $stmt->execute();
    $stmt->close();

    // pig_pen_records - device_code lives here now, along with the
    // rest of the pen's editable record data
    $stmt = $conn->prepare('UPDATE pig_pen_records SET device_code = ?, pig_count = ?, avg_weight = ?, pig_age_at_registration = ?, age_category = ? WHERE pen_id = ?');
    $stmt->bind_param('sidisi', $device_code, $pig_count, $avg_weight, $pig_age_at_registration, $age_category, $pen_id);
    $stmt->execute();
    $stmt->close();

    // devices — only touched when the device code actually changed
    if ($deviceChanged) {
        $stmt = $conn->prepare("UPDATE devices SET device_status = 'available' WHERE device_code = ?");
        $stmt->bind_param('s', $currentDeviceCode);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("UPDATE devices SET device_status = 'assigned' WHERE device_code = ?");
        $stmt->bind_param('s', $device_code);
        $stmt->execute();
        $stmt->close();
    }

    $conn->commit();

    $response['success'] = true;
    $response['message'] = 'Pig pen updated successfully.';
    echo json_encode($response);
} catch (\Throwable $e) {
    $conn->rollback();

    $response['error_code'] = 'DB_ERROR';
    $response['message'] = 'Something went wrong while updating the pig pen.';
    echo json_encode($response);
}

$conn->close();