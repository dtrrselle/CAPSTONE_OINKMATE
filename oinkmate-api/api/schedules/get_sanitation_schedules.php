<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

// Expecting farmer_id via query string, e.g.
// get_sanitation_schedules.php?farmer_id=1
$farmer_id = isset($_GET['farmer_id']) ? $_GET['farmer_id'] : null;

if (!$farmer_id) {
    echo json_encode([
        'success' => false,
        'message' => 'farmer_id is required'
    ]);
    exit;
}

$sql = "SELECT
            ss.sanitation_id,
            ss.pen_id,
            pp.pen_name,
            ss.schedule_time,
            ss.duration_minutes,
            ss.trigger_temperature,
            ss.status
        FROM sanitation_schedules ss
        INNER JOIN pig_pens pp
            ON ss.pen_id = pp.pen_id
        WHERE pp.farmer_id = ?
        ORDER BY ss.schedule_time ASC";

$stmt = mysqli_prepare($conn, $sql);

if (!$stmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Query preparation failed: ' . mysqli_error($conn)
    ]);
    exit;
}

mysqli_stmt_bind_param($stmt, 'i', $farmer_id);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

$schedules = [];
while ($row = mysqli_fetch_assoc($result)) {
    $schedules[] = $row;
}

echo json_encode([
    'success' => true,
    'schedules' => $schedules
]);

mysqli_stmt_close($stmt);
mysqli_close($conn);
?>