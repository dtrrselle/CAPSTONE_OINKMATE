<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

// Read JSON body
$data = json_decode(file_get_contents('php://input'), true);

function send_error($message) {
    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
    exit;
}

if (!is_array($data)) {
    send_error('Invalid JSON payload');
}

// Validate required fields
$required = ['farmer_id', 'fullname', 'email', 'contact_number', 'farm_name', 'farm_address'];
foreach ($required as $field) {
    if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
        send_error("Missing required field: $field");
    }
}

$farmer_id       = $data['farmer_id'];
$fullname        = $data['fullname'];
$email           = $data['email'];
$contact_number  = $data['contact_number'];
$farm_name       = $data['farm_name'];
$farm_address    = $data['farm_address'];

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    send_error('Invalid email format');
}

// $conn is expected to be provided by config/database.php (mysqli connection)
if (!isset($conn) || !($conn instanceof mysqli)) {
    send_error('Database connection not available');
}

// 1. Find corresponding user_id from farmers table
$stmt = $conn->prepare('SELECT user_id FROM farmers WHERE farmer_id = ?');
if (!$stmt) {
    send_error('Failed to prepare statement: ' . $conn->error);
}
$stmt->bind_param('i', $farmer_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $stmt->close();
    send_error('Farmer not found');
}

$row = $result->fetch_assoc();
$user_id = $row['user_id'];
$stmt->close();

// 2. Begin transaction
$conn->begin_transaction();

try {
    // Update users table (email only)
    $stmtUser = $conn->prepare('UPDATE users SET email = ? WHERE user_id = ?');
    if (!$stmtUser) {
        throw new Exception('Failed to prepare user update: ' . $conn->error);
    }
    $stmtUser->bind_param('si', $email, $user_id);
    if (!$stmtUser->execute()) {
        throw new Exception('Failed to update users table: ' . $stmtUser->error);
    }
    $stmtUser->close();

    // Update farmers table
    $stmtFarmer = $conn->prepare(
        'UPDATE farmers
         SET fullname = ?, contact_number = ?, farm_name = ?, farm_address = ?
         WHERE farmer_id = ?'
    );
    if (!$stmtFarmer) {
        throw new Exception('Failed to prepare farmer update: ' . $conn->error);
    }
    $stmtFarmer->bind_param('ssssi', $fullname, $contact_number, $farm_name, $farm_address, $farmer_id);
    if (!$stmtFarmer->execute()) {
        throw new Exception('Failed to update farmers table: ' . $stmtFarmer->error);
    }
    $stmtFarmer->close();

    // Commit transaction
    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully'
    ]);
} catch (Exception $e) {
    $conn->rollback();
    send_error($e->getMessage());
}

$conn->close();