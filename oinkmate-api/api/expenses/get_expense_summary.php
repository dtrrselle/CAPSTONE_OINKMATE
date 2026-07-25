<?php
/**
 * GET /api/expenses/get_expense_summary.php
 *
 * Query params:
 *   farmer_id (required) — the logged-in farmer's id
 *   period    (optional) — 'today' | 'week' | 'month' | 'year', default 'month'
 *                           controls which date range the category breakdown covers.
 *                           The four overview totals are always returned together,
 *                           regardless of this value.
 *
 * Response:
 * {
 *   "success": true,
 *   "period": "month",
 *   "overview": { "today": 1250, "week": 5800, "month": 18500, "year": 156000 },
 *   "categories": [
 *     { "category": "Feed", "total": 12000 },
 *     { "category": "Water", "total": 2300 },
 *     ...
 *   ]
 * }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Expects this file to expose a connected mysqli instance as $conn.
require_once __DIR__ . '/../../config/database.php';

$farmer_id = isset($_GET['farmer_id']) ? trim($_GET['farmer_id']) : '';
$period    = isset($_GET['period']) ? strtolower(trim($_GET['period'])) : 'month';

$validPeriods = ['today', 'week', 'month', 'year'];
if (!in_array($period, $validPeriods, true)) {
    $period = 'month';
}

if ($farmer_id === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'farmer_id is required',
    ]);
    exit;
}

// Canonical category list — keeps display order & icons stable on the frontend
// even when a category has zero expenses in the selected period.
$CATEGORY_KEYS = ['Feed', 'Water', 'Electricity', 'Veterinary', 'Maintenance', 'Equipment', 'Others'];

// Date range filters, expressed in MySQL date functions.
// 'week' uses an ISO week (Monday start) so it lines up across month boundaries.
$dateFilters = [
    'today' => 'expense_date = CURDATE()',
    'week'  => 'YEARWEEK(expense_date, 1) = YEARWEEK(CURDATE(), 1)',
    'month' => 'MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE())',
    'year'  => 'YEAR(expense_date) = YEAR(CURDATE())',
];

// ---- Overview totals (today / week / month / year) ----
$overview = [];
foreach ($dateFilters as $key => $condition) {
    $sql = "SELECT COALESCE(SUM(amount), 0) AS total
            FROM expenses
            WHERE farmer_id = ?
            AND {$condition}";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query prepare failed', 'error' => $conn->error]);
        exit;
    }
    $stmt->bind_param('s', $farmer_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $overview[$key] = round((float) $row['total'], 2);
    $stmt->close();
}

// ---- Category breakdown for the selected period ----
$condition = $dateFilters[$period];
$sql = "SELECT category, COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE farmer_id = ?
        AND {$condition}
        GROUP BY category";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query prepare failed', 'error' => $conn->error]);
    exit;
}
$stmt->bind_param('s', $farmer_id);
$stmt->execute();
$result = $stmt->get_result();

// Index DB results by lowercased category name so lookups are case-insensitive.
$totalsByCategory = [];
while ($row = $result->fetch_assoc()) {
    $totalsByCategory[strtolower(trim($row['category']))] = round((float) $row['total'], 2);
}
$stmt->close();

$categories = [];
foreach ($CATEGORY_KEYS as $categoryLabel) {
    $lookupKey = strtolower($categoryLabel);
    $categories[] = [
        'category' => $categoryLabel,
        'total' => $totalsByCategory[$lookupKey] ?? 0,
    ];
}

echo json_encode([
    'success' => true,
    'period' => $period,
    'overview' => $overview,
    'categories' => $categories,
]);

$conn->close();