<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

$farmer_id = isset($_GET['farmer_id']) ? intval($_GET['farmer_id']) : null;

if (!$farmer_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing farmer_id.'
    ]);
    exit;
}

$total_pens = 0;
$total_pigs = 0;

// Count total pig pens owned by the farmer
$pensStmt = mysqli_prepare(
    $conn,
    "SELECT COUNT(*) AS total_pens FROM pig_pens WHERE farmer_id = ?"
);
mysqli_stmt_bind_param($pensStmt, 'i', $farmer_id);
mysqli_stmt_execute($pensStmt);
$pensResult = mysqli_stmt_get_result($pensStmt);

if ($pensResult && $row = mysqli_fetch_assoc($pensResult)) {
    $total_pens = (int) $row['total_pens'];
}

mysqli_stmt_close($pensStmt);

// Sum all pig_count values from pig_pen_records belonging to the farmer's pig pens
$pigsStmt = mysqli_prepare(
    $conn,
    "SELECT COALESCE(SUM(ppr.pig_count), 0) AS total_pigs
     FROM pig_pen_records ppr
     INNER JOIN pig_pens pp ON ppr.pen_id = pp.pen_id
     WHERE pp.farmer_id = ?"
);
mysqli_stmt_bind_param($pigsStmt, 'i', $farmer_id);
mysqli_stmt_execute($pigsStmt);
$pigsResult = mysqli_stmt_get_result($pigsStmt);

if ($pigsResult && $row = mysqli_fetch_assoc($pigsResult)) {
    $total_pigs = (int) $row['total_pigs'];
}

mysqli_stmt_close($pigsStmt);

echo json_encode([
    'success' => true,
    'total_pens' => $total_pens,
    'total_pigs' => $total_pigs
]);

mysqli_close($conn);