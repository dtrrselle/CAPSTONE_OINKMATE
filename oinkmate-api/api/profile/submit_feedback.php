<?php

header("Content-Type: application/json");

require_once '../../config/cors.php';
require_once '../../config/database.php';

// Read and decode JSON input
$rawData = file_get_contents("php://input");
$data    = json_decode($rawData);

// ── Basic input checks ────────────────────────────────────────────────────
if (!$data || !isset($data->farmer_id) || !isset($data->feedback)) {
    echo json_encode([
        "success" => false,
        "message" => "farmer_id and feedback are required."
    ]);
    exit();
}

$farmerId = (int) $data->farmer_id;
$feedback = trim($data->feedback);

if ($farmerId <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid farmer_id."
    ]);
    exit();
}

if ($feedback === '') {
    echo json_encode([
        "success" => false,
        "message" => "Feedback cannot be empty."
    ]);
    exit();
}

// ── Insert feedback ────────────────────────────────────────────────────────
// Prepared statement — prevents SQL injection.
$stmt = mysqli_prepare(
    $conn,
    "INSERT INTO feedbacks (farmer_id, feedback) VALUES (?, ?)"
);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Prepare failed: " . mysqli_error($conn)
    ]);
    exit();
}

mysqli_stmt_bind_param($stmt, "is", $farmerId, $feedback);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode([
        "success" => true,
        "message" => "Feedback submitted successfully."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to submit feedback: " . mysqli_stmt_error($stmt)
    ]);
}

mysqli_stmt_close($stmt);

?>