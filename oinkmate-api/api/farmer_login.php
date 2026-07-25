<?php

header("Content-Type: application/json");

include "../config/cors.php";
include "../config/database.php";

// Read and decode JSON input
$rawData = file_get_contents("php://input");
$data    = json_decode($rawData);

// ── Basic input checks ────────────────────────────────────────────────────
if (!$data || !isset($data->email) || !isset($data->password)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request. Email and password are required."
    ]);
    exit();
}

$email    = trim($data->email);
$password = $data->password;

if (empty($email) || empty($password)) {
    echo json_encode([
        "success" => false,
        "message" => "Email and password cannot be empty."
    ]);
    exit();
}

// Basic email format check on server side too
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid email format."
    ]);
    exit();
}

// ── Prepared statement — prevents SQL injection ───────────────────────────
$stmt = mysqli_prepare(
    $conn,
    "SELECT
        u.user_id,
        u.email,
        u.role,
        u.password,
        f.farmer_id,
        f.fullname,
        f.contact_number,
        f.farm_name,
        f.farm_address
    FROM users u
    LEFT JOIN farmers f
        ON u.user_id = f.user_id
    WHERE u.email = ?"
);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Server error. Please try again later."
    ]);
    exit();
}

mysqli_stmt_bind_param($stmt, "s", $email);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

if (mysqli_num_rows($result) === 0) {
    mysqli_stmt_close($stmt);
    echo json_encode([
        "success" => false,
        "message" => "No account found with that email address."
    ]);
    exit();
}

$user = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

// ── Verify hashed password ────────────────────────────────────────────────
if (password_verify($password, $user['password'])) {

    echo json_encode([
        "success" => true,
        "message" => "Login Successful",
        "user" => [
            "user_id" => $user['user_id'],
            "farmer_id" => $user['farmer_id'],
            "fullname" => $user['fullname'],
            "email" => $user['email'],
            "role" => $user['role'],
            "contact_number" => $user['contact_number'],
            "farm_name" => $user['farm_name'],
            "farm_address" => $user['farm_address']
        ]
    ]);

} else {

    echo json_encode([
        "success" => false,
        "message" => "Incorrect password. Please try again."
    ]);

}
?>