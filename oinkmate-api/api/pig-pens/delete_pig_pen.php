<?php
/**
 * delete_pig_pen.php
 *
 * Deletes a pig pen and its related records inside a MySQLi transaction:
 *   1. Look up device_code from pig_pens using pen_id
 *   2. Delete from pig_pen_records
 *   3. Delete from pig_pens
 *   4. Update devices.device_status = 'available'
 *   5. Commit (or roll back on any failure)
 */

include "../../config/cors.php";
include "../../config/database.php";

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

$penId    = $data['pen_id'] ?? null;
$farmerId = $data['farmer_id'] ?? null; // optional, used to scope the delete to the owning farmer

if (!$penId) {
    echo json_encode([
        'success' => false,
        'message' => 'pen_id is required',
    ]);
    exit;
}

mysqli_begin_transaction($conn);

try {
    // Look up the pen first so we know which device to free up,
    // and (optionally) confirm it belongs to this farmer.
    // device_code now lives only in pig_pen_records, not pig_pens, so
    // it must be joined in here rather than selected off pig_pens.
    if ($farmerId) {
        $lookupSql = "SELECT r.device_code
                      FROM pig_pens p
                      JOIN pig_pen_records r ON r.pen_id = p.pen_id
                      WHERE p.pen_id = ? AND p.farmer_id = ?";
        $lookupStmt = mysqli_prepare($conn, $lookupSql);
        mysqli_stmt_bind_param($lookupStmt, "ii", $penId, $farmerId);
    } else {
        $lookupSql = "SELECT r.device_code
                      FROM pig_pens p
                      JOIN pig_pen_records r ON r.pen_id = p.pen_id
                      WHERE p.pen_id = ?";
        $lookupStmt = mysqli_prepare($conn, $lookupSql);
        mysqli_stmt_bind_param($lookupStmt, "i", $penId);
    }

    if (!$lookupStmt) {
        throw new Exception('Failed to prepare pen lookup: ' . mysqli_error($conn));
    }

    mysqli_stmt_execute($lookupStmt);
    $lookupResult = mysqli_stmt_get_result($lookupStmt);
    $pen = mysqli_fetch_assoc($lookupResult);
    mysqli_stmt_close($lookupStmt);

    if (!$pen) {
        mysqli_rollback($conn);
        echo json_encode([
            'success' => false,
            'message' => 'Pig pen not found',
        ]);
        exit;
    }

    $deviceCode = $pen['device_code'];

    // 1. Delete related pig_pen_records
    $deleteRecordsSql = "DELETE FROM pig_pen_records WHERE pen_id = ?";
    $deleteRecordsStmt = mysqli_prepare($conn, $deleteRecordsSql);
    if (!$deleteRecordsStmt) {
        throw new Exception('Failed to prepare pig_pen_records delete: ' . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($deleteRecordsStmt, "i", $penId);
    if (!mysqli_stmt_execute($deleteRecordsStmt)) {
        throw new Exception('Failed to delete pig_pen_records: ' . mysqli_stmt_error($deleteRecordsStmt));
    }
    mysqli_stmt_close($deleteRecordsStmt);

    // 2. Delete the pig_pens record
    $deletePenSql = "DELETE FROM pig_pens WHERE pen_id = ?";
    $deletePenStmt = mysqli_prepare($conn, $deletePenSql);
    if (!$deletePenStmt) {
        throw new Exception('Failed to prepare pig_pens delete: ' . mysqli_error($conn));
    }
    mysqli_stmt_bind_param($deletePenStmt, "i", $penId);
    if (!mysqli_stmt_execute($deletePenStmt)) {
        throw new Exception('Failed to delete pig_pens: ' . mysqli_stmt_error($deletePenStmt));
    }
    mysqli_stmt_close($deletePenStmt);

    // 3. Free up the device so it can be reassigned to a new pen
    if ($deviceCode) {
        $updateDeviceSql = "UPDATE devices SET device_status = 'available' WHERE device_code = ?";
        $updateDeviceStmt = mysqli_prepare($conn, $updateDeviceSql);
        if (!$updateDeviceStmt) {
            throw new Exception('Failed to prepare device update: ' . mysqli_error($conn));
        }
        mysqli_stmt_bind_param($updateDeviceStmt, "s", $deviceCode);
        if (!mysqli_stmt_execute($updateDeviceStmt)) {
            throw new Exception('Failed to update device status: ' . mysqli_stmt_error($updateDeviceStmt));
        }
        mysqli_stmt_close($updateDeviceStmt);

        // Keep manual_override in sync: remove its record for this
        // device now that the pig pen has been deleted, inside the
        // same transaction so a failure here rolls back the delete.
        $deleteOverrideSql = "DELETE FROM manual_override WHERE device_code = ?";
        $deleteOverrideStmt = mysqli_prepare($conn, $deleteOverrideSql);
        if (!$deleteOverrideStmt) {
            throw new Exception('Failed to prepare manual_override delete: ' . mysqli_error($conn));
        }
        mysqli_stmt_bind_param($deleteOverrideStmt, "s", $deviceCode);
        if (!mysqli_stmt_execute($deleteOverrideStmt)) {
            throw new Exception('Failed to delete manual_override: ' . mysqli_stmt_error($deleteOverrideStmt));
        }
        mysqli_stmt_close($deleteOverrideStmt);
    }

    mysqli_commit($conn);

    echo json_encode([
        'success' => true,
        'message' => 'Pig pen deleted successfully',
    ]);
} catch (Exception $e) {
    mysqli_rollback($conn);

    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete pig pen',
        'error'   => $e->getMessage(),
    ]);
}

mysqli_close($conn);