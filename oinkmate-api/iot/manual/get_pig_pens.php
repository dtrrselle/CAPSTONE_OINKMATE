<?php
// ── Buffer all output so stray warnings/HTML never reach the client ───────
ob_start();

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

if (function_exists('mysqli_report')) {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
}

header("Content-Type: application/json");

function send_json_response($payload) {
    if (ob_get_length() !== false) {
        ob_end_clean();
    }
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
            "success" => false,
            "message" => "Fatal error: " . $error['message'] .
                " in " . $error['file'] . " on line " . $error['line']
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
   $corsPath     = __DIR__ . "/../../../config/cors.php";
    $databasePath = __DIR__ . "/../../../config/database.php";

    if (!file_exists($corsPath)) {
        throw new RuntimeException("Missing required file: config/cors.php");
    }
    if (!file_exists($databasePath)) {
        throw new RuntimeException("Missing required file: config/database.php");
    }

    include $corsPath;
    include $databasePath;

    // ── Validate the database connection ───────────────────────────────
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new RuntimeException("Database connection was not established.");
    }

    // ── Read and decode JSON input ─────────────────────────────────────
    $rawData = file_get_contents("php://input");
    $data    = json_decode($rawData);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new InvalidArgumentException("Invalid JSON in request body: " . json_last_error_msg());
    }

    // ── Basic input checks ──────────────────────────────────────────────
    if (!$data || !isset($data->farmer_id)) {
        send_json_response([
            "success" => false,
            "message" => "farmer_id is required."
        ]);
    }

    $farmerId = (int) $data->farmer_id;

    if ($farmerId <= 0) {
        send_json_response([
            "success" => false,
            "message" => "Invalid farmer_id."
        ]);
    }

    // ── Fetch pig pens + their device_code, joined by pen_id ────────────
    // Prepared statement — prevents SQL injection.
    // NOTE: mirrors the same LEFT JOIN shape used in the main pig-pens
    // endpoint (pig_pens -> pig_pen_records for device_code). If a pen can
    // have more than one pig_pen_records row, this — like that endpoint —
    // doesn't de-duplicate to "latest only"; add an ORDER BY / GROUP BY here
    // if that turns out to matter for the dropdown.
    $stmt = mysqli_prepare(
        $conn,
        "SELECT
            pp.pen_id,
            pp.pen_name,
            ppr.device_code
        FROM pig_pens pp
        LEFT JOIN pig_pen_records ppr
            ON pp.pen_id = ppr.pen_id
        WHERE pp.farmer_id = ?
        ORDER BY pp.pen_name ASC"
    );

    if (!$stmt) {
        throw new RuntimeException("Prepare failed: " . mysqli_error($conn));
    }

    mysqli_stmt_bind_param($stmt, "i", $farmerId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    if ($result === false) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException("Query execution failed: " . mysqli_error($conn));
    }

    $pigPens = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $pigPens[] = [
            "pen_id"      => (int) $row['pen_id'],
            "pen_name"    => $row['pen_name'],
            "device_code" => $row['device_code'],
        ];
    }

    mysqli_stmt_close($stmt);

    send_json_response([
        "success"  => true,
        "pig_pens" => $pigPens
    ]);

} catch (Throwable $e) {
    // DEBUG NOTE: actual error message included for development. Swap to
    // a generic message before shipping to production if you don't want
    // internal details exposed to clients.
    send_json_response([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ]);
}