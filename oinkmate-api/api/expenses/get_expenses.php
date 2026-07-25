<?php
/**
 * GET /api/expenses/get_expenses.php
 *
 * Query params:
 *   farmer_id (required)
 *
 * Loads all expenses for the logged-in farmer, newest first.
 *
 * Response:
 * {
 *   "success": true,
 *   "expenses": [
 *     {
 *       "expense_id": "12",
 *       "expense_date": "2026-06-29",
 *       "category": "Veterinary",
 *       "amount": 500,
 *       "description": "Vaccination for piglets"
 *     },
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

// $conn (mysqli) is expected to come from this file — config/ is a sibling of api/.
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

$sql = "SELECT expense_id, expense_date, category, amount, description
        FROM expenses
        WHERE farmer_id = ?
        ORDER BY expense_date DESC, expense_id DESC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query prepare failed', 'error' => $conn->error]);
    exit;
}

$stmt->bind_param('s', $farmer_id);
$stmt->execute();
$result = $stmt->get_result();

$expenses = [];
while ($row = $result->fetch_assoc()) {
    $expenses[] = [
        'expense_id' => $row['expense_id'],
        'expense_date' => $row['expense_date'],
        'category' => $row['category'],
        'amount' => (float) $row['amount'],
        'description' => $row['description'] ?? '',
    ];
}
$stmt->close();

echo json_encode([
    'success' => true,
    'expenses' => $expenses,
]);

$conn->close();