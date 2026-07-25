<?php
/**
 * GET /api/expenses/get_expense_details.php
 *
 * Query params:
 *   expense_id (required)
 *   farmer_id  (optional) — if provided, adds an extra ownership check so a
 *                           farmer can't fetch another farmer's expense_id.
 *
 * Response:
 * {
 *   "success": true,
 *   "expense": {
 *     "expense_id": "12",
 *     "expense_date": "2026-06-29",
 *     "category": "Veterinary",
 *     "amount": 500,
 *     "description": "Vaccination for piglets"
 *   }
 * }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/../../config/database.php';

$expense_id = isset($_GET['expense_id']) ? trim($_GET['expense_id']) : '';
$farmer_id = isset($_GET['farmer_id']) ? trim($_GET['farmer_id']) : '';

if ($expense_id === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'expense_id is required',
    ]);
    exit;
}

if ($farmer_id !== '') {
    $sql = "SELECT expense_id, expense_date, category, amount, description
            FROM expenses
            WHERE expense_id = ? AND farmer_id = ?
            LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query prepare failed', 'error' => $conn->error]);
        exit;
    }
    $stmt->bind_param('ss', $expense_id, $farmer_id);
} else {
    $sql = "SELECT expense_id, expense_date, category, amount, description
            FROM expenses
            WHERE expense_id = ?
            LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Query prepare failed', 'error' => $conn->error]);
        exit;
    }
    $stmt->bind_param('s', $expense_id);
}

$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Expense not found',
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'expense' => [
        'expense_id' => $row['expense_id'],
        'expense_date' => $row['expense_date'],
        'category' => $row['category'],
        'amount' => (float) $row['amount'],
        'description' => $row['description'] ?? '',
    ],
]);

$conn->close();