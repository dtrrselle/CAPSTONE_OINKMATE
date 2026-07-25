<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../phpmailer/src/Exception.php';
require_once __DIR__ . '/../phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../phpmailer/src/SMTP.php';

function getMailer()
{
    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->SMTPDebug = 0;
    $mail->SMTPAutoTLS = true;

    // CHANGE THIS
    $mail->Username   = 'detorresjanellemae@gmail.com';

    // APP PASSWORD 
    $mail->Password   = 'fumo nfpk dsgu unhf';

    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->CharSet = 'UTF-8';
    $mail->Encoding = 'base64';

    $mail->setFrom(
        'detorresjanellemae@gmail.com',
        'OinkMate'
    );

    return $mail;
}