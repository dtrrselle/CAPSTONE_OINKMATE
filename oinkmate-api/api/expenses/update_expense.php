<?php
/**
 * POST /api/expenses/update_expense.php
 *
 * Body (JSON or form):
 *   expense_id   (required)
 *   expense_date (required) — 'YYYY-MM-DD'
 *   category     (required)
 *   amount       (required, must be > 0)
 *   description  (optional)
 *
 * Response:
 * { "success": true, "message": "Expense updated successfully." }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/../../config/database.php';

// Accept either JSON body or standard form-encoded POST.
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$expense_id   = isset($input['expense_id']) ? trim($input['expense_id']) : '';
$expense_date = isset($input['expense_date']) ? trim($input['expense_date']) : '';
$category     = isset($input['category']) ? trim($input['category']) : '';
$amountRaw    = isset($input['amount']) ? $input['amount'] : '';
$description  = isset($input['description']) ? trim($input['description']) : '';

if ($expense_id === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'expense_id is required']);
    exit;
}

if ($category === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Category is required']);
    exit;
}

if ($amountRaw === '' || !is_numeric($amountRaw)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Amount is required']);
    exit;
}

$amount = (float) $amountRaw;
if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Amount must be greater than 0']);
    exit;
}

if ($expense_date === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Expense date is required']);
    exit;
}

$sql = "UPDATE expenses
        SET expense_date = ?, category = ?, amount = ?, description = ?
        WHERE expense_id = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Query prepare failed', 'error' => $conn->error]);
    exit;
}

$stmt->bind_param('ssdss', $expense_date, $category, $amount, $description, $expense_id);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to update expense', 'error' => $stmt->error]);
    $stmt->close();
    exit;
}

$stmt->close();

echo json_encode([
    'success' => true,
    'message' => 'Expense updated successfully.',
]);

$conn->close();