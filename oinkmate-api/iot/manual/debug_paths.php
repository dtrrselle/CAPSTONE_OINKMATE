<?php
/**
 * TEMPORARY DEBUG SCRIPT — for diagnosing the "Missing required file:
 * config/database.php" error on the live server.
 *
 * Upload this as api/iot/manual/debug_paths.php, hit it directly in the
 * browser (GET), screenshot the JSON it returns, then DELETE this file
 * from the server afterward — it exposes filesystem paths and should
 * never stay on a production server.
 */

header('Content-Type: application/json');

$candidates = [
    '__DIR__ itself'                  => __DIR__,
    '1 level up (../config)'          => __DIR__ . '/../config/database.php',
    '2 levels up (../../config)'      => __DIR__ . '/../../config/database.php',
    '3 levels up (../../../config)'   => __DIR__ . '/../../../config/database.php',
    '4 levels up (../../../../config)'=> __DIR__ . '/../../../../config/database.php',
];

$results = [];
foreach ($candidates as $label => $path) {
    $results[] = [
        'label'       => $label,
        'path'        => $path,
        'realpath'    => realpath($path) ?: null,
        'file_exists' => file_exists($path),
    ];
}

echo json_encode([
    'success'            => true,
    'this_file_dir'      => __DIR__,
    'document_root'      => $_SERVER['DOCUMENT_ROOT'] ?? null,
    'script_filename'    => $_SERVER['SCRIPT_FILENAME'] ?? null,
    'candidates'         => $results,
], JSON_PRETTY_PRINT);