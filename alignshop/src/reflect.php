<?php
$data = (string)$_POST['content'];
$name = (string)$_POST['name'];

// Simply reflects content back to the user
header('Content-Description: File Transfer');
header('Content-Type: text/plain');
header('Content-Disposition: attachment; filename=' . $name);
header('Content-Transfer-Encoding: binary');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
header('Content-Length: ' . strlen($data));

ob_clean();
flush();
echo $data;
exit;