<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");

include "../../config/cors.php";
include "../../config/database.php";
include "../../helpers/feeding_helper.php";

// Read and decode JSON input
$rawData = file_get_contents("php://input");
$data    = json_decode($rawData);

// ── Basic input checks ────────────────────────────────────────────────────
if (!$data) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request body."
    ]);
    exit();
}

$requiredFields = ["farmer_id", "device_code", "pen_name", "pig_count", "pig_age_at_registration"];
$missingFields  = [];

foreach ($requiredFields as $field) {
    if (!isset($data->$field) || (is_string($data->$field) && trim($data->$field) === "")) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    echo json_encode([
        "success" => false,
        "message" => "Missing required field(s): " . implode(", ", $missingFields)
    ]);
    exit();
}

$farmerId    = (int) $data->farmer_id;
$deviceCode  = trim($data->device_code);
$penName     = trim($data->pen_name);
$description = isset($data->description) ? trim($data->description) : null;
$pigCount    = (int) $data->pig_count;
$pigAgeAtRegistration = (int) $data->pig_age_at_registration;
$avgWeight   = isset($data->avg_weight) && $data->avg_weight !== "" ? (float) $data->avg_weight : null;

if ($farmerId <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid farmer_id."
    ]);
    exit();
}

if ($pigCount <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "pig_count must be a positive number."
    ]);
    exit();
}

if ($pigAgeAtRegistration <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "pig_age_at_registration must be a positive number."
    ]);
    exit();
}

// Derive age_category from feeding_reference.csv brackets (via
// feeding_helper.php) instead of accepting it from the client. This keeps
// age_category consistent with the same Growth Stage logic used everywhere
// else in the app (get_pig_pens.php, get_pig_pen_details.php).
$ageCategory = determineGrowthStage($pigAgeAtRegistration);

// ── Check if device_code already exists ───────────────────────────────────
$checkStmt = mysqli_prepare(
    $conn,
    "SELECT pen_id FROM pig_pen_records WHERE device_code = ? LIMIT 1"
);

if (!$checkStmt) {
    echo json_encode([
        "success" => false,
        "message" => "Prepare failed (check device_code): " . mysqli_error($conn)
    ]);
    exit();
}

mysqli_stmt_bind_param($checkStmt, "s", $deviceCode);
mysqli_stmt_execute($checkStmt);
$checkResult = mysqli_stmt_get_result($checkStmt);

if (mysqli_num_rows($checkResult) > 0) {
    mysqli_stmt_close($checkStmt);
    echo json_encode([
        "success" => false,
        "message" => "This device code is already assigned to another pig pen."
    ]);
    exit();
}

mysqli_stmt_close($checkStmt);

// ── Validate device_code against the devices table ────────────────────────
$deviceStmt = mysqli_prepare(
    $conn,
    "SELECT device_id, device_status FROM devices WHERE device_code = ? LIMIT 1"
);

if (!$deviceStmt) {
    echo json_encode([
        "success" => false,
        "message" => "Prepare failed (check device): " . mysqli_error($conn)
    ]);
    exit();
}

mysqli_stmt_bind_param($deviceStmt, "s", $deviceCode);
mysqli_stmt_execute($deviceStmt);
$deviceResult = mysqli_stmt_get_result($deviceStmt);

if (mysqli_num_rows($deviceResult) === 0) {
    mysqli_stmt_close($deviceStmt);
    echo json_encode([
        "success" => false,
        "message" => "The entered device code does not exist."
    ]);
    exit();
}

$device = mysqli_fetch_assoc($deviceResult);
mysqli_stmt_close($deviceStmt);

if ($device['device_status'] === 'assigned') {
    echo json_encode([
        "success" => false,
        "message" => "This device code is already assigned."
    ]);
    exit();
}

// ── Insert pig pen + pig pen record inside a transaction ─────────────────
mysqli_begin_transaction($conn);

try {
    // Insert into pig_pens
    $insertPenStmt = mysqli_prepare(
        $conn,
        "INSERT INTO pig_pens (farmer_id, pen_name, description, created_at)
         VALUES (?, ?, ?, NOW())"
    );

    if (!$insertPenStmt) {
        throw new Exception("Prepare failed (pig_pens insert): " . mysqli_error($conn));
    }

    mysqli_stmt_bind_param(
        $insertPenStmt,
        "iss",
        $farmerId,
        $penName,
        $description
    );

    if (!mysqli_stmt_execute($insertPenStmt)) {
        throw new Exception("Insert failed (pig_pens): " . mysqli_stmt_error($insertPenStmt));
    }

    $penId = mysqli_insert_id($conn);
    mysqli_stmt_close($insertPenStmt);

    // Insert into pig_pen_records
    $insertRecordStmt = mysqli_prepare(
        $conn,
        "INSERT INTO pig_pen_records (pen_id, device_code, pig_count, pig_age_at_registration, avg_weight, age_category, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())"
    );

    if (!$insertRecordStmt) {
        throw new Exception("Prepare failed (pig_pen_records insert): " . mysqli_error($conn));
    }

    mysqli_stmt_bind_param(
        $insertRecordStmt,
        "isiids",
        $penId,
        $deviceCode,
        $pigCount,
        $pigAgeAtRegistration,
        $avgWeight,
        $ageCategory
    );

    if (!mysqli_stmt_execute($insertRecordStmt)) {
        throw new Exception("Insert failed (pig_pen_records): " . mysqli_stmt_error($insertRecordStmt));
    }

    mysqli_stmt_close($insertRecordStmt);

    // Mark the device as assigned now that it's linked to a pig pen
    $updateDeviceStmt = mysqli_prepare(
        $conn,
        "UPDATE devices SET device_status = 'assigned' WHERE device_code = ?"
    );

    if (!$updateDeviceStmt) {
        throw new Exception("Prepare failed (device status update): " . mysqli_error($conn));
    }

    mysqli_stmt_bind_param($updateDeviceStmt, "s", $deviceCode);

    if (!mysqli_stmt_execute($updateDeviceStmt)) {
        throw new Exception("Update failed (device status): " . mysqli_stmt_error($updateDeviceStmt));
    }

    mysqli_stmt_close($updateDeviceStmt);

    // Keep manual_override in sync: create its record for this device
    // now that the pig pen has been created, inside the same
    // transaction so a failure here rolls back the whole pig pen.
    $insertOverrideStmt = mysqli_prepare(
        $conn,
        "INSERT INTO manual_override (device_code, manual_feeding, manual_sanitation)
         VALUES (?, 0, 0)"
    );

    if (!$insertOverrideStmt) {
        throw new Exception("Prepare failed (manual_override insert): " . mysqli_error($conn));
    }

    mysqli_stmt_bind_param($insertOverrideStmt, "s", $deviceCode);

    if (!mysqli_stmt_execute($insertOverrideStmt)) {
        throw new Exception("Insert failed (manual_override): " . mysqli_stmt_error($insertOverrideStmt));
    }

    mysqli_stmt_close($insertOverrideStmt);

    mysqli_commit($conn);

    echo json_encode([
        "success" => true,
        "message" => "Pig pen created successfully"
    ]);

} catch (Exception $e) {
    mysqli_rollback($conn);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

?>