<?php
// get_educational_contents.php
// Returns all educational contents (list view fields only) for the
// Learning Hub / Educational Contents screen.

header('Content-Type: application/json');

include "../../config/cors.php";
include "../../config/database.php";

try {
    $sql = "SELECT id, title, category, author, description
            FROM educational_contents
            ORDER BY id DESC";

    $result = $conn->query($sql);

    if ($result === false) {
        throw new Exception($conn->error);
    }

    $contents = [];
    while ($row = $result->fetch_assoc()) {
        $contents[] = [
            'id'          => $row['id'],
            'title'       => $row['title'],
            'category'    => $row['category'],
            'author'      => $row['author'],
            'description' => $row['description'],
        ];
    }

    echo json_encode([
        'success' => true,
        'message' => 'Educational contents retrieved successfully.',
        'data'    => $contents,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve educational contents.',
        'error'   => $e->getMessage(),
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}