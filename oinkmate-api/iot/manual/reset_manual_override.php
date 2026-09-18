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

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        respond(['success' => false, 'message' => 'Only POST requests are allowed.'], 405);
    }

    $input = $_POST;
    if (empty($input)) {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $input = $decoded;
        }
    }

    $deviceCode = isset($input['device_code']) ? trim((string) $input['device_code']) : '';

    if ($deviceCode === '') {
        respond(['success' => false, 'message' => 'device_code is required.'], 400);
    }

    // ── Confirm the device exists before attempting the reset ──────────
    $checkStmt = mysqli_prepare($conn, 'SELECT COUNT(*) AS cnt FROM manual_override WHERE device_code = ?');
    if (!$checkStmt) {
        throw new RuntimeException('Prepare failed: ' . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($checkStmt, 's', $deviceCode);
    mysqli_stmt_execute($checkStmt);
    $checkResult = mysqli_stmt_get_result($checkStmt);
    $exists = $checkResult ? (int) mysqli_fetch_assoc($checkResult)['cnt'] : 0;
    mysqli_stmt_close($checkStmt);

    if ($exists === 0) {
        respond(['success' => false, 'message' => 'No manual override record found for the given device_code.'], 404);
    }

    // ── Reset the record ────────────────────────────────────────────────
    $resetStmt = mysqli_prepare(
        $conn,
        'UPDATE manual_override
         SET manual_feeding = 0,
             manual_sanitation = 0
         WHERE device_code = ?'
    );
    if (!$resetStmt) {
        throw new RuntimeException('Prepare failed: ' . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($resetStmt, 's', $deviceCode);
    mysqli_stmt_execute($resetStmt);
    mysqli_stmt_close($resetStmt);

    respond(['success' => true, 'message' => 'Manual override reset successfully.']);

} catch (Throwable $e) {
    error_log('reset_manual_override.php error: ' . $e->getMessage());
    // DEBUG NOTE: actual error message included for development. Swap to
    // a generic message before shipping to production if you don't want
    // internal details exposed to clients.
    respond(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
}