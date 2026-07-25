<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

// Read JSON body sent from the app.
$data = json_decode(file_get_contents('php://input'), true);

// ── Validation ──────────────────────────────────────────────────────────────
// Required: farmer_id, expense_date, category, amount. description is optional.
if (
    !isset($data['farmer_id']) ||
    !isset($data['expense_date']) || trim($data['expense_date']) === '' ||
    !isset($data['category']) || trim($data['category']) === '' ||
    !isset($data['amount']) || $data['amount'] === ''
) {
    $response['message'] = 'Missing required fields.';
    echo json_encode($response);
    exit;
}

$farmer_id     = intval($data['farmer_id']);
$expense_date  = $data['expense_date'];
$category      = $data['category'];
$amount        = floatval($data['amount']);
$description   = isset($data['description']) ? $data['description'] : '';

if ($farmer_id <= 0) {
    $response['message'] = 'Invalid farmer_id.';
    echo json_encode($response);
    exit;
}

if ($amount <= 0) {
    $response['message'] = 'Amount must be greater than 0.';
    echo json_encode($response);
    exit;
}

// ── Insert ───────────────────────────────────────────────────────────────────
$sql = "INSERT INTO expenses (farmer_id, expense_date, category, amount, description, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    $response['message'] = 'Database error: ' . $conn->error;
    echo json_encode($response);
    exit;
}

$stmt->bind_param('issds', $farmer_id, $expense_date, $category, $amount, $description);

if ($stmt->execute()) {
    $response['success'] = true;
    $response['message'] = 'Expense added successfully.';
} else {
    $response['message'] = 'Failed to add expense: ' . $stmt->error;
}

$stmt->close();
$conn->close();

echo json_encode($response);