<?php

require_once __DIR__ . '/mail_config.php';

function sendWelcomeEmail($fullname, $email)
{
    try {

        $mail = getMailer();

        $mail->addAddress($email, $fullname);

        // Logo (embedded)
        $mail->addEmbeddedImage(
            __DIR__ . '/../assets/images/logo.png',
            'oinkmate_logo'
        );

        $mail->isHTML(true);
        $mail->Subject = "Welcome to OinkMate! 🐷";

        $mail->Body = "
<!DOCTYPE html>
<html>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width,initial-scale=1'>
</head>
<body style='margin:0;padding:0;background:#F0F5F3;font-family:Arial,Helvetica,sans-serif;'>

<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#F0F5F3;padding:32px 16px;'>
<tr><td align='center'>

  <!-- CARD -->
  <table width='560' cellpadding='0' cellspacing='0' border='0' style='background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 30px rgba(0,0,0,0.09);'>

    <!-- HEADER -->
    <tr>
      <td align='center' style='background:linear-gradient(135deg,#2F5D50 0%,#3d7a68 100%);padding:36px 40px 28px;'>
        <img src='cid:oinkmate_logo' width='90' alt='OinkMate' style='display:block;margin:0 auto 14px;'>
        <h1 style='margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;'>Welcome to OinkMate!</h1>
        <p style='margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;'>Smart Piggery Management</p>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td style='padding:32px 40px 8px;'>

        <p style='margin:0 0 6px;font-size:18px;color:#1a1a1a;font-weight:600;'>Hello, {$fullname} 👋</p>
        <p style='margin:0 0 24px;font-size:14px;color:#666;line-height:22px;'>
          Your OinkMate farmer account is ready. We're excited to help you manage your piggery smarter and more efficiently.
        </p>

        <!-- DIVIDER -->
        <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:24px;'>
          <tr><td style='border-top:1px solid #eef0ee;'></td></tr>
        </table>


        <!-- HIGHLIGHT BOX -->
        <table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin:24px 0 0;'>
          <tr>
            <td style='background:#FFF0F5;border-left:4px solid #F59BB1;border-radius:0 10px 10px 0;padding:14px 18px;'>
              <p style='margin:0;font-size:13px;color:#c0607a;line-height:20px;'>
                Thank you for choosing OinkMate. We are committed to helping farmers improve productivity through smart farming technology.
              </p>
            </td>
          </tr>
        </table>

        <!-- CLOSING -->
        <p style='margin:28px 0 0;font-size:14px;color:#444;'>Happy Farming! 🌿<br><strong style='color:#2F5D50;'>The OinkMate Team</strong></p>

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td align='center' style='background:#FFF2F5;padding:20px 40px;margin-top:24px;border-top:1px solid #fde0e8;'>
        <p style='margin:0;font-size:12px;color:#F59BB1;font-weight:700;'>Smart Farming Starts Here.</p>
        <p style='margin:4px 0 0;font-size:11px;color:#bbb;'>© 2026 OinkMate. All Rights Reserved.</p>
      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>";

        $mail->send();

        return true;

    } catch (Exception $e) 
    {
    error_log("Mailer Error: " . $mail->ErrorInfo);
    return false;
    }       
}