<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

// Accept farmer_id from either GET (query string) or POST (form body).
$farmer_id = $_GET['farmer_id'] ?? $_POST['farmer_id'] ?? null;

if (!$farmer_id) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'farmer_id is required'
    ]);
    exit;
}

try {
    $stmt = $conn->prepare(
        "SELECT
            fs.schedule_id,
            fs.pen_id,
            pp.pen_name,
            fs.feeding_time,
            fs.feed_amount_per_pig,
            fs.status,
            COALESCE(SUM(ppr.pig_count), 0) AS pig_count
         FROM feeding_schedules fs
         INNER JOIN pig_pens pp
             ON fs.pen_id = pp.pen_id
         LEFT JOIN pig_pen_records ppr
             ON fs.pen_id = ppr.pen_id
         WHERE pp.farmer_id = ?
         GROUP BY
            fs.schedule_id,
            fs.pen_id,
            pp.pen_name,
            fs.feeding_time,
            fs.feed_amount_per_pig,
            fs.status
         ORDER BY fs.schedule_id ASC"
    );

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param('i', $farmer_id);
    $stmt->execute();

    $result = $stmt->get_result();

    $schedules = [];
    while ($row = $result->fetch_assoc()) {
        // Always recompute from the latest Pig Count instead of trusting the
        // stored total_feed_required / feed_per_container columns, since the
        // Pig Pen's headcount may have changed since this schedule was created.
        $pig_count = (int) $row['pig_count'];
        $feed_amount_per_pig = (float) $row['feed_amount_per_pig'];
        $total_feed_required = $pig_count * $feed_amount_per_pig;
        $feed_per_container = $total_feed_required / 3;

        $schedules[] = [
            'schedule_id'          => (int) $row['schedule_id'],
            'pen_id'               => (int) $row['pen_id'],
            'pen_name'             => $row['pen_name'],
            'feeding_time'         => $row['feeding_time'],
            'feed_amount_per_pig'  => $feed_amount_per_pig,
            'total_feed_required'  => $total_feed_required,
            'feed_per_container'   => $feed_per_container,
            'status'               => $row['status'],
        ];
    }

    $stmt->close();

    echo json_encode([
        'success' => true,
        'schedules' => $schedules
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load feeding schedules',
        'error' => $e->getMessage()
    ]);
}

$conn->close();