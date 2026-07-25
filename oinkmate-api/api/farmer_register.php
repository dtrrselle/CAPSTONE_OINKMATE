<?php

header("Content-Type: application/json");

include "../config/cors.php";
include "../config/database.php";
require_once "../mail/send_welcome_email.php";

// Read and decode JSON input
$rawData = file_get_contents("php://input");
$data    = json_decode($rawData);

// ── Basic input presence check ────────────────────────────────────────────
$required = ['fullname', 'contact_number', 'farm_name', 'farm_address', 'email', 'password'];
foreach ($required as $field) {
    if (!isset($data->$field) || trim($data->$field) === '') {
        echo json_encode([
            "success" => false,
            "message" => "All fields are required."
        ]);
        exit();
    }
}

// ── Sanitize / trim inputs ────────────────────────────────────────────────
// trim() removes leading/trailing whitespace.
// Special characters (apostrophes, etc.) are safe with prepared statements below.
$fullname       = trim($data->fullname);
$contact_number = trim($data->contact_number);
$farm_name      = trim($data->farm_name);
$farm_address   = trim($data->farm_address);
$email          = trim($data->email);
$password       = $data->password; // do NOT trim passwords

// ── Server-side validation ────────────────────────────────────────────────
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid email format."
    ]);
    exit();
}

if (strlen($password) < 8) {
    echo json_encode([
        "success" => false,
        "message" => "Password must be at least 8 characters."
    ]);
    exit();
}

if (!preg_match('/[A-Z]/', $password)) {
    echo json_encode([
        "success" => false,
        "message" => "Password must contain at least one uppercase letter."
    ]);
    exit();
}

if (!preg_match('/[a-z]/', $password)) {
    echo json_encode([
        "success" => false,
        "message" => "Password must contain at least one lowercase letter."
    ]);
    exit();
}

if (!preg_match('/[0-9]/', $password)) {
    echo json_encode([
        "success" => false,
        "message" => "Password must contain at least one number."
    ]);
    exit();
}

if (!preg_match('/[^A-Za-z0-9]/', $password)) {
    echo json_encode([
        "success" => false,
        "message" => "Password must contain at least one special character."
    ]);
    exit();
}

// ── Check for duplicate email — prepared statement ────────────────────────
$stmtCheck = mysqli_prepare($conn, "SELECT user_id FROM users WHERE email = ? LIMIT 1");

if (!$stmtCheck) {
    echo json_encode([
        "success" => false,
        "message" => "Server error. Please try again later."
    ]);
    exit();
}

mysqli_stmt_bind_param($stmtCheck, "s", $email);
mysqli_stmt_execute($stmtCheck);
mysqli_stmt_store_result($stmtCheck);

if (mysqli_stmt_num_rows($stmtCheck) > 0) {
    mysqli_stmt_close($stmtCheck);
    echo json_encode([
        "success" => false,
        "message" => "An account with this email already exists."
    ]);
    exit();
}
mysqli_stmt_close($stmtCheck);

// ── Hash password ─────────────────────────────────────────────────────────
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// ── Insert into users — prepared statement ────────────────────────────────
$stmtUser = mysqli_prepare(
    $conn,
    "INSERT INTO users (email, password, role) VALUES (?, ?, 'farmer')"
);

if (!$stmtUser) {
    echo json_encode([
        "success" => false,
        "message" => "Server error. Please try again later."
    ]);
    exit();
}

mysqli_stmt_bind_param($stmtUser, "ss", $email, $hashedPassword);

if (!mysqli_stmt_execute($stmtUser)) {
    mysqli_stmt_close($stmtUser);
    echo json_encode([
        "success" => false,
        "message" => "Registration failed. Please try again."
    ]);
    exit();
}

$user_id = mysqli_insert_id($conn);
mysqli_stmt_close($stmtUser);

// ── Insert into farmers — prepared statement ──────────────────────────────
// Using prepared statements means apostrophes in names (O'Connor, Farmer's Paradise)
// are handled safely without any manual escaping.
$stmtFarmer = mysqli_prepare(
    $conn,
    "INSERT INTO farmers (user_id, fullname, contact_number, farm_name, farm_address)
     VALUES (?, ?, ?, ?, ?)"
);

if (!$stmtFarmer) {
    // Rollback the users insert to keep data consistent
    mysqli_query($conn, "DELETE FROM users WHERE user_id = '$user_id'");
    echo json_encode([
        "success" => false,
        "message" => "Server error. Please try again later."
    ]);
    exit();
}

mysqli_stmt_bind_param($stmtFarmer, "issss", $user_id, $fullname, $contact_number, $farm_name, $farm_address);

if (!mysqli_stmt_execute($stmtFarmer)) {
    $errMsg = mysqli_stmt_error($stmtFarmer);
    mysqli_stmt_close($stmtFarmer);
    // Rollback the users insert
    mysqli_query($conn, "DELETE FROM users WHERE user_id = '$user_id'");
    echo json_encode([
        "success" => false,
        "message" => "Registration failed. Please try again."
    ]);
    exit();
}

mysqli_stmt_close($stmtFarmer);

// Send welcome email
sendWelcomeEmail($fullname, $email);

echo json_encode([
    "success" => true,
    "message" => "Registration Successful"
]);
?>