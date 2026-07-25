<?php
/**
 * api/schedules/add_sanitation_schedule.php
 *
 * Creates a new Sanitation Schedule.
 *
 * Method: POST (JSON body)
 * Input:
 *   pen_id                (required)
 *   schedule_time          (required) "HH:MM" / "HH:MM:SS" / "8:00 AM"
 *   duration_minutes       (required) integer, 1-30
 *   trigger_temperature    (optional) number, or null/blank to leave unset
 *   status                 (required) 'active' | 'inactive'
 *
 * Output (JSON):
 *   { "success": true, "message": "Sanitation schedule created successfully" }
 *   { "success": false, "message": "..." }
 *
 * DB table: sanitation_schedules (sanitation_id, pen_id, schedule_time, duration_minutes, trigger_temperature, status)
 * NOTE: sanitation_type has been removed from the DB and is intentionally not used here.
 */

require_once '../../config/cors.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

$pen_id = isset($input['pen_id']) ? (int) $input['pen_id'] : 0;
$schedule_time_raw = isset($input['schedule_time']) ? trim($input['schedule_time']) : '';
$status = isset($input['status']) ? strtolower(trim($input['status'])) : '';

// duration_minutes is REQUIRED — must be a whole number between 1 and 30.
$duration_minutes_raw = $input['duration_minutes'] ?? null;
$hasDurationMinutes = $duration_minutes_raw !== null && $duration_minutes_raw !== '';

if (!$hasDurationMinutes) {
    echo json_encode([
        'success' => false,
        'message' => 'Sanitation duration is required.',
    ]);
    exit;
}

if (
    !is_numeric($duration_minutes_raw) ||
    (float) $duration_minutes_raw != (int) $duration_minutes_raw
) {
    echo json_encode([
        'success' => false,
        'message' => 'Sanitation duration must be a whole number.',
    ]);
    exit;
}

$duration_minutes = (int) $duration_minutes_raw;

if ($duration_minutes < 1 || $duration_minutes > 30) {
    echo json_encode([
        'success' => false,
        'message' => 'Sanitation duration must be between 1 and 30 minutes.',
    ]);
    exit;
}

// trigger_temperature is OPTIONAL — accept missing key, null, or blank string as "no value".
$trigger_temperature = null;
$hasTriggerTemperature =
    array_key_exists('trigger_temperature', $input) &&
    $input['trigger_temperature'] !== null &&
    $input['trigger_temperature'] !== '';

if ($hasTriggerTemperature) {
    if (!is_numeric($input['trigger_temperature'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Trigger temperature must be a number.',
        ]);
        exit;
    }
    $trigger_temperature = (float) $input['trigger_temperature'];
}

// Normalize schedule_time to 24-hour "HH:MM:SS" for the TIME column.
function normalizeScheduleTime(string $time): string {
    $time = trim($time);
    if ($time === '') {
        return '';
    }
    if (preg_match('/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i', $time, $m)) {
        $hours = (int) $m[1];
        $minutes = $m[2];
        $modifier = strtoupper($m[3]);
        if ($modifier === 'PM' && $hours !== 12) {
            $hours += 12;
        } elseif ($modifier === 'AM' && $hours === 12) {
            $hours = 0;
        }
        return sprintf('%02d:%s:00', $hours, $minutes);
    }
    if (preg_match('/^\d{1,2}:\d{2}$/', $time)) {
        return $time . ':00';
    }
    if (preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $time)) {
        return $time;
    }
    return '';
}

$schedule_time = normalizeScheduleTime($schedule_time_raw);

if (
    $pen_id <= 0 ||
    $schedule_time === '' ||
    !in_array($status, ['active', 'inactive'], true)
) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing or invalid fields.',
    ]);
    exit;
}

// Duplicate check: a sanitation schedule with the same pen_id + schedule_time
// must not already exist.
$checkStmt = mysqli_prepare(
    $conn,
    "SELECT sanitation_id FROM sanitation_schedules WHERE pen_id = ? AND schedule_time = ? LIMIT 1"
);

if (!$checkStmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . mysqli_error($conn),
    ]);
    exit;
}

mysqli_stmt_bind_param($checkStmt, 'is', $pen_id, $schedule_time);
mysqli_stmt_execute($checkStmt);
mysqli_stmt_store_result($checkStmt);

if (mysqli_stmt_num_rows($checkStmt) > 0) {
    mysqli_stmt_close($checkStmt);
    echo json_encode([
        'success' => false,
        'duplicate' => true,
        'message' => 'A sanitation schedule already exists for this Pig Pen and time.',
    ]);
    exit;
}

mysqli_stmt_close($checkStmt);

$stmt = mysqli_prepare(
    $conn,
    "INSERT INTO sanitation_schedules (pen_id, schedule_time, duration_minutes, trigger_temperature, status)
     VALUES (?, ?, ?, ?, ?)"
);

if (!$stmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . mysqli_error($conn),
    ]);
    exit;
}

// 'i' pen_id, 's' schedule_time, 'i' duration_minutes, 'd' trigger_temperature (nullable), 's' status
mysqli_stmt_bind_param($stmt, 'isids', $pen_id, $schedule_time, $duration_minutes, $trigger_temperature, $status);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode([
        'success' => true,
        'message' => 'Sanitation schedule created successfully',
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . mysqli_stmt_error($stmt),
    ]);
}

mysqli_stmt_close($stmt);
mysqli_close($conn);