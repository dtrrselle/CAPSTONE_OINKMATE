<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$data = json_decode(file_get_contents('php://input'), true);

$sanitation_id = $data['sanitation_id'] ?? null;

if (!$sanitation_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Schedule not found.'
    ]);
    exit;
}

// Check if schedule exists
$checkStmt = $conn->prepare('SELECT sanitation_id FROM sanitation_schedules WHERE sanitation_id = ?');
$checkStmt->bind_param('i', $sanitation_id);
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
$deleteStmt = $conn->prepare('DELETE FROM sanitation_schedules WHERE sanitation_id = ?');
$deleteStmt->bind_param('i', $sanitation_id);

if ($deleteStmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Sanitation schedule deleted successfully.'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Schedule not found.'
    ]);
}

$deleteStmt->close();
$conn->close();