<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

header('Content-Type: application/json');

$farmer_id = isset($_GET['farmer_id']) ? $_GET['farmer_id'] : null;

if (!$farmer_id) {
    echo json_encode([
        "success" => false,
        "message" => "farmer_id is required"
    ]);
    exit;
}

$sql = "SELECT f.fullname AS fullname, u.email AS email,
               f.contact_number AS contact_number,
               f.farm_name AS farm_name,
               f.farm_address AS farm_address
        FROM farmers f
        INNER JOIN users u ON f.user_id = u.user_id
        WHERE f.farmer_id = ?";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Query preparation failed"
    ]);
    exit;
}

$stmt->bind_param("i", $farmer_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    echo json_encode([
        "success" => true,
        "profile" => [
            "fullname" => $row['fullname'],
            "email" => $row['email'],
            "contact_number" => $row['contact_number'],
            "farm_name" => $row['farm_name'],
            "farm_address" => $row['farm_address'],
        ]
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Farmer profile not found"
    ]);
}

$stmt->close();
$conn->close();