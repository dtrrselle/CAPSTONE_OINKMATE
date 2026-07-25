<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$data = json_decode(file_get_contents('php://input'), true);

$schedule_id = $data['schedule_id'] ?? null;

if (!$schedule_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Schedule not found.'
    ]);
    exit;
}

// Check if schedule exists
$checkStmt = $conn->prepare('SELECT schedule_id FROM feeding_schedules WHERE schedule_id = ?');
$checkStmt->bind_param('i', $schedule_id);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Schedule not found.'
    ]);
    $checkStmt->close();
    $conn->close();
    exit;
}
$checkStmt->close();

// Delete the schedule
$deleteStmt = $conn->prepare('DELETE FROM feeding_schedules WHERE schedule_id = ?');
$deleteStmt->bind_param('i', $schedule_id);

if ($deleteStmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Feeding schedule deleted successfully.'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Schedule not found.'
    ]);
}

$deleteStmt->close();
$conn->close();