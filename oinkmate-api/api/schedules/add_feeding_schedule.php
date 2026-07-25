<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid or missing JSON body'
    ]);
    exit;
}

$pen_id = $input['pen_id'] ?? null;
$feeding_time = $input['feeding_time'] ?? null;
$feed_amount_per_pig = $input['feed_amount_per_pig'] ?? null;
$total_feed_required = $input['total_feed_required'] ?? null;
$feed_per_container = $input['feed_per_container'] ?? null;
$status = $input['status'] ?? null;

if (
    !$pen_id ||
    !$feeding_time ||
    $feed_amount_per_pig === null ||
    $total_feed_required === null ||
    $feed_per_container === null ||
    !$status
) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Missing required fields'
    ]);
    exit;
}

try {
    // Duplicate check: a feeding schedule with the same pen_id + feeding_time
    // must not already exist.
    $checkStmt = $conn->prepare(
        "SELECT schedule_id FROM feeding_schedules WHERE pen_id = ? AND feeding_time = ? LIMIT 1"
    );

    if (!$checkStmt) {
        throw new Exception($conn->error);
    }

    $checkStmt->bind_param('is', $pen_id, $feeding_time);
    $checkStmt->execute();
    $checkStmt->store_result();

    if ($checkStmt->num_rows > 0) {
        $checkStmt->close();
        echo json_encode([
            'success' => false,
            'duplicate' => true,
            'message' => 'A feeding schedule already exists for this Pig Pen and time.'
        ]);
        $conn->close();
        exit;
    }

    $checkStmt->close();

    $stmt = $conn->prepare(
        "INSERT INTO feeding_schedules
            (pen_id, feeding_time, feed_amount_per_pig, total_feed_required, feed_per_container, status)
         VALUES (?, ?, ?, ?, ?, ?)"
    );

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    // Types: pen_id (i), feeding_time (s), feed_amount_per_pig (d),
    // total_feed_required (d), feed_per_container (d), status (s)
    $stmt->bind_param(
        'isddds',
        $pen_id,
        $feeding_time,
        $feed_amount_per_pig,
        $total_feed_required,
        $feed_per_container,
        $status
    );

    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Feeding schedule created successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to save feeding schedule'
        ]);
    }

    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to save feeding schedule',
        'error' => $e->getMessage()
    ]);
}

$conn->close();