<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../../config/cors.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

$schedule_id = isset($data['schedule_id']) ? intval($data['schedule_id']) : 0;
$pen_id = isset($data['pen_id']) ? intval($data['pen_id']) : 0;

$feeding_time = isset($data['feeding_time'])
    ? trim($data['feeding_time'])
    : '';

$feed_amount_per_pig = isset($data['feed_amount_per_pig'])
    ? floatval($data['feed_amount_per_pig'])
    : 0;

$total_feed_required = isset($data['total_feed_required'])
    ? floatval($data['total_feed_required'])
    : 0;

$feed_per_container = isset($data['feed_per_container'])
    ? floatval($data['feed_per_container'])
    : 0;

$status = isset($data['status'])
    ? trim($data['status'])
    : '';

if (
    $schedule_id <= 0 ||
    $pen_id <= 0 ||
    empty($feeding_time)
) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing required fields.'
    ]);
    exit;
}

/*
|--------------------------------------------------------------------------
| CHECK IF SCHEDULE EXISTS
|--------------------------------------------------------------------------
*/

$checkSql = "
SELECT schedule_id
FROM feeding_schedules
WHERE schedule_id = ?
";

$checkStmt = mysqli_prepare($conn, $checkSql);

if (!$checkStmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare check query.'
    ]);
    exit;
}

mysqli_stmt_bind_param(
    $checkStmt,
    "i",
    $schedule_id
);

mysqli_stmt_execute($checkStmt);

$checkResult = mysqli_stmt_get_result($checkStmt);

if (!$checkResult || mysqli_num_rows($checkResult) === 0) {

    echo json_encode([
        'success' => false,
        'message' => 'Schedule not found.'
    ]);

    exit;
}

mysqli_stmt_close($checkStmt);

/*
|--------------------------------------------------------------------------
| CHECK FOR DUPLICATE SCHEDULE (same pen + same time, excluding itself)
|--------------------------------------------------------------------------
*/

$dupSql = "
SELECT schedule_id
FROM feeding_schedules
WHERE pen_id = ?
  AND feeding_time = ?
  AND schedule_id != ?
";

$dupStmt = mysqli_prepare($conn, $dupSql);

if (!$dupStmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare duplicate check query.'
    ]);
    exit;
}

mysqli_stmt_bind_param(
    $dupStmt,
    "isi",
    $pen_id,
    $feeding_time,
    $schedule_id
);

mysqli_stmt_execute($dupStmt);

$dupResult = mysqli_stmt_get_result($dupStmt);

if ($dupResult && mysqli_num_rows($dupResult) > 0) {

    echo json_encode([
        'success' => false,
        'duplicate' => true,
        'message' => 'A feeding schedule already exists for this pig pen at this time.'
    ]);

    mysqli_stmt_close($dupStmt);
    mysqli_close($conn);
    exit;
}

mysqli_stmt_close($dupStmt);

/*
|--------------------------------------------------------------------------
| UPDATE FEEDING SCHEDULE
|--------------------------------------------------------------------------
*/

$updateSql = "
UPDATE feeding_schedules
SET
    pen_id = ?,
    feeding_time = ?,
    feed_amount_per_pig = ?,
    total_feed_required = ?,
    feed_per_container = ?,
    status = ?
WHERE schedule_id = ?
";

$updateStmt = mysqli_prepare($conn, $updateSql);

if (!$updateStmt) {

    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare update query.'
    ]);

    exit;
}

mysqli_stmt_bind_param(
    $updateStmt,
    "isdddsi",
    $pen_id,
    $feeding_time,
    $feed_amount_per_pig,
    $total_feed_required,
    $feed_per_container,
    $status,
    $schedule_id
);

$success = mysqli_stmt_execute($updateStmt);

if ($success) {

    echo json_encode([
        'success' => true,
        'message' => 'Schedule updated successfully.'
    ]);

} else {

    echo json_encode([
        'success' => false,
        'message' => mysqli_error($conn)
    ]);
}

mysqli_stmt_close($updateStmt);
mysqli_close($conn);

?>