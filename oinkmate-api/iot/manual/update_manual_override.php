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

    // Accept either standard form-encoded POST or a JSON body.
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

    if (!array_key_exists('manual_feeding', $input) || !array_key_exists('manual_sanitation', $input)) {
        respond(['success' => false, 'message' => 'manual_feeding and manual_sanitation are required.'], 400);
    }

    // Normalize truthy/falsy input (true/false, "true"/"false", 1/0, "1"/"0") to a strict 0/1.
    $normalizeBool = function ($value): ?int {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        $filtered = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($filtered === null) {
            return null;
        }
        return $filtered ? 1 : 0;
    };

    $manualFeeding = $normalizeBool($input['manual_feeding']);
    $manualSanitation = $normalizeBool($input['manual_sanitation']);

    if ($manualFeeding === null || $manualSanitation === null) {
        respond(['success' => false, 'message' => 'manual_feeding and manual_sanitation must be boolean-like (0/1).'], 400);
    }

    // ── Confirm the device exists before attempting the update, so we can
    // return a clear, specific failure instead of a silent no-op. ───────
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

    // ── Update the record ───────────────────────────────────────────────
    $updateStmt = mysqli_prepare(
        $conn,
        'UPDATE manual_override
         SET manual_feeding = ?,
             manual_sanitation = ?
         WHERE device_code = ?'
    );
    if (!$updateStmt) {
        throw new RuntimeException('Prepare failed: ' . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($updateStmt, 'iis', $manualFeeding, $manualSanitation, $deviceCode);
    mysqli_stmt_execute($updateStmt);
    mysqli_stmt_close($updateStmt);

    respond(['success' => true, 'message' => 'Manual override updated successfully.']);

} catch (Throwable $e) {
    error_log('update_manual_override.php error: ' . $e->getMessage());
    // DEBUG NOTE: actual error message included for development. Swap to
    // a generic message before shipping to production if you don't want
    // internal details exposed to clients.
    respond(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
}