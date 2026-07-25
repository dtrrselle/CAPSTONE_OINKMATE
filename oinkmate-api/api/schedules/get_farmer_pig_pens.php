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
        "SELECT pen_id, pen_name
         FROM pig_pens
         WHERE farmer_id = ?
         ORDER BY pen_name ASC"
    );

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param('i', $farmer_id);
    $stmt->execute();

    $result = $stmt->get_result();

    $pig_pens = [];
    while ($row = $result->fetch_assoc()) {
        $pig_pens[] = [
            'pen_id'   => (int) $row['pen_id'],
            'pen_name' => $row['pen_name'],
        ];
    }

    $stmt->close();

    echo json_encode([
        'success' => true,
        'pig_pens' => $pig_pens
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load pig pens',
        'error' => $e->getMessage()
    ]);
}

$conn->close();