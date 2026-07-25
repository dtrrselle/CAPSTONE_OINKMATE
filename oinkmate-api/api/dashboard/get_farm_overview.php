<?php
/**
 * GET /api/dashboard/get_farm_overview.php
 *
 * Query params:
 *   farmer_id (required)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "total_pig_pens": 6,
 *     "total_pigs": 120,
 *     "active_pens": 5
 *   }
 * }
 *
 * ASSUMPTION: pig_pen_records has columns (pen_id, pig_count, record_date,
 * record_id) where record_id is an auto-increment primary key used as a
 * tiebreaker when two records share the same record_date. Adjust the column
 * names below if your schema differs.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// config/ is a sibling of api/ — same layout as the expenses endpoints.
require_once __DIR__ . '/../../config/database.php';

$farmer_id = isset($_GET['farmer_id']) ? trim($_GET['farmer_id']) : '';

if ($farmer_id === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'farmer_id is required',
    ]);
    exit;
}

// Total Pig Pens — every pen registered to this farmer, regardless of records.
$totalPigPens = 0;
$sql = "SELECT COUNT(*) AS total FROM pig_pens WHERE farmer_id = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query prepare failed', 'error' => $conn->error]);
    exit;
}
$stmt->bind_param('s', $farmer_id);
$stmt->execute();
$result = $stmt->get_result();
if ($row = $result->fetch_assoc()) {
    $totalPigPens = (int) $row['total'];
}
$stmt->close();

// Total Pigs / Active Pens — pull each pen's most recent pig_count via a
// correlated subquery (portable across MySQL versions, no window functions).
$totalPigs = 0;
$activePens = 0;

$sql = "SELECT pp.pen_id,
               (SELECT pr.pig_count
                FROM pig_pen_records pr
                WHERE pr.pen_id = pp.pen_id
                ORDER BY pr.updated_at DESC, pr.record_id DESC
                LIMIT 1) AS latest_pig_count
        FROM pig_pens pp
        WHERE pp.farmer_id = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query prepare failed', 'error' => $conn->error]);
    exit;
}
$stmt->bind_param('s', $farmer_id);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $latestCount = $row['latest_pig_count'] !== null ? (int) $row['latest_pig_count'] : 0;
    $totalPigs += $latestCount;
    if ($latestCount > 0) {
        $activePens++;
    }
}
$stmt->close();

echo json_encode([
    'success' => true,
    'data' => [
        'total_pig_pens' => $totalPigPens,
        'total_pigs' => $totalPigs,
        'active_pens' => $activePens,
    ],
]);

$conn->close();