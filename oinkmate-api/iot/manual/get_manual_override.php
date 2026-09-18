<?php


// ── Buffer all output so stray warnings/HTML never reach the client ───────
ob_start();

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

if (function_exists('mysqli_report')) {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
}

header('Content-Type: application/json');

function respond(array $payload, int $httpCode = 200): void {
    if (ob_get_length() !== false) {
        ob_end_clean();
    }
    http_response_code($httpCode);
    echo json_encode($payload);
    exit();
}

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (ob_get_length() !== false) {
            ob_end_clean();
        }
        echo json_encode([
            'success' => false,
            'message' => 'Fatal error: ' . $error['message'] .
                ' in ' . $error['file'] . ' on line ' . $error['line']
        ]);
    }
});

set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {

    $databasePath = __DIR__ . '/../../../config/database.php';

    if (!file_exists($databasePath)) {
        throw new RuntimeException('Missing required file: config/database.php');
    }

    require_once $databasePath; // expects $conn (mysqli)

    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new RuntimeException('Database connection was not established.');
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? '';

    if ($method !== 'GET' && $method !== 'POST') {
        respond(['success' => false, 'message' => 'Only GET or POST requests are allowed.'], 405);
    }

    // Support device_code coming from the query string (GET) or a POST
    // body (form-encoded or JSON), since callers may hit this either way.
    $deviceCode = '';
    if ($method === 'GET') {
        $deviceCode = isset($_GET['device_code']) ? trim((string) $_GET['device_code']) : '';
    } else {
        $input = $_POST;
        if (empty($input)) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $input = $decoded;
            }
        }
        $deviceCode = isset($input['device_code']) ? trim((string) $input['device_code']) : '';
    }

    if ($deviceCode === '') {
        respond(['success' => false, 'message' => 'device_code is required.'], 400);
    }

    $stmt = mysqli_prepare(
        $conn,
        'SELECT manual_feeding, manual_sanitation
         FROM manual_override
         WHERE device_code = ?
         LIMIT 1'
    );

    if (!$stmt) {
        throw new RuntimeException('Prepare failed: ' . mysqli_error($conn));
    }

    mysqli_stmt_bind_param($stmt, 's', $deviceCode);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    if ($result === false) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('Query execution failed: ' . mysqli_error($conn));
    }

    $row = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if ($row === null) {
        respond(['success' => false, 'message' => 'No manual override record found for the given device_code.'], 404);
    }

    respond([
        'success' => true,
        'manual_feeding' => (int) $row['manual_feeding'],
        'manual_sanitation' => (int) $row['manual_sanitation'],
    ]);

} catch (Throwable $e) {
    error_log('get_manual_override.php error: ' . $e->getMessage());
    // DEBUG NOTE: actual error message included for development. Swap to
    // a generic message before shipping to production if you don't want
    // internal details exposed to clients.
    respond(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
}