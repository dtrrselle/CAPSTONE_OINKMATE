<?php
// get_educational_content_details.php
// Returns the full details of a single educational content record,
// used by the Educational Content Details screen.

header('Content-Type: application/json');

include "../../config/cors.php";
include "../../config/database.php";

try {
    if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'A valid id is required.',
        ]);
        exit;
    }

    $id = (int) $_GET['id'];

    $stmt = $conn->prepare(
        "SELECT id, title, category, author, description, body, source_url
         FROM educational_contents
         WHERE id = ?"
    );

    if ($stmt === false) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param('i', $id);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Educational content not found.',
        ]);
        $stmt->close();
        exit;
    }

    $row = $result->fetch_assoc();

    $content = [
        'id'          => $row['id'],
        'title'       => $row['title'],
        'category'    => $row['category'],
        'author'      => $row['author'],
        'description' => $row['description'],
        'body'        => $row['body'],
        'source_url'  => $row['source_url'],
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Educational content details retrieved successfully.',
        'data'    => $content,
    ]);

    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve educational content details.',
        'error'   => $e->getMessage(),
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}