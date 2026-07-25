<?php

require_once '../../config/cors.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

$sanitation_id = isset($input['sanitation_id']) ? intval($input['sanitation_id']) : 0;
$pen_id = isset($input['pen_id']) ? intval($input['pen_id']) : 0;
$schedule_time = isset($input['schedule_time']) ? $input['schedule_time'] : '';
$trigger_temperature = (array_key_exists('trigger_temperature', $input) && $input['trigger_temperature'] !== null)
    ? floatval($input['trigger_temperature'])
    : null;
$status = isset($input['status']) ? $input['status'] : 'active';

if (!$sanitation_id || !$pen_id || !$schedule_time) {
    echo json_encode([
        'success' => false,
        'message' => 'sanitation_id, pen_id, and schedule_time are required.'
    ]);
    exit;
}

/*
|--------------------------------------------------------------------------
| VALIDATE DURATION MINUTES
|--------------------------------------------------------------------------
*/

$duration_minutes_raw = $input['duration_minutes'] ?? null;
$hasDurationMinutes = $duration_minutes_raw !== null && $duration_minutes_raw !== '';

if (!$hasDurationMinutes) {
    echo json_encode([
        'success' => false,
        'message' => 'Sanitation duration is required.'
    ]);
    exit;
}

if (
    !is_numeric($duration_minutes_raw) ||
    (float) $duration_minutes_raw != (int) $duration_minutes_raw
) {
    echo json_encode([
        'success' => false,
        'message' => 'Sanitation duration must be a whole number.'
    ]);
    exit;
}

$duration_minutes = (int) $duration_minutes_raw;

if ($duration_minutes < 1 || $duration_minutes > 30) {
    echo json_encode([
        'success' => false,
        'message' => 'Sanitation duration must be between 1 and 30 minutes.'
    ]);
    exit;
}

/*
|--------------------------------------------------------------------------
| CHECK FOR DUPLICATE SCHEDULE (same pen + same time, excluding itself)
|--------------------------------------------------------------------------
*/

$dupSql = "
SELECT sanitation_id
FROM sanitation_schedules
WHERE pen_id = ?
  AND schedule_time = ?
  AND sanitation_id != ?
LIMIT 1
";

$dupStmt = mysqli_prepare($conn, $dupSql);

if (!$dupStmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare duplicate check query'
    ]);
    exit;
}

mysqli_stmt_bind_param($dupStmt, "isi", $pen_id, $schedule_time, $sanitation_id);
mysqli_stmt_execute($dupStmt);
$dupResult = mysqli_stmt_get_result($dupStmt);

if ($dupResult && mysqli_num_rows($dupResult) > 0) {
    echo json_encode([
        'success' => false,
        'duplicate' => true,
        'message' => 'A sanitation schedule already exists for this pig pen at this time.'
    ]);
    mysqli_stmt_close($dupStmt);
    mysqli_close($conn);
    exit;
}

mysqli_stmt_close($dupStmt);

/*
|--------------------------------------------------------------------------
| UPDATE SANITATION SCHEDULE
|--------------------------------------------------------------------------
*/

$sql = "
UPDATE sanitation_schedules
SET pen_id = ?, schedule_time = ?, duration_minutes = ?, trigger_temperature = ?, status = ?
WHERE sanitation_id = ?
";

$stmt = mysqli_prepare($conn, $sql);

if (!$stmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to prepare update query'
    ]);
    exit;
}

mysqli_stmt_bind_param($stmt, "isidsi", $pen_id, $schedule_time, $duration_minutes, $trigger_temperature, $status, $sanitation_id);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode([
        'success' => true,
        'message' => 'Sanitation schedule updated successfully.'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update sanitation schedule: ' . mysqli_stmt_error($stmt)
    ]);
}

mysqli_stmt_close($stmt);
mysqli_close($conn);

?>