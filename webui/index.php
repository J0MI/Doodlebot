<?php

session_start();

require_once('config.php');
require_once('functions.php');

if ( $_POST['login'] ){
	$lines = file(DOODLE_WEB_PASS_FILE);
	foreach ( $lines => $line ){
		$test = trim($_POST['username'] + ' ' + $_POST['password']);
		if ( strlen($test) > 0 && trim($line) == $test ){
			$_SESSION['username'] = $_POST['username'];
			$_SESSION['loggedin'] = true;
			break;
		}
	}
}
elseif ( $_POST['logout'] ){
	$_SESSION['loggedin'] = false;
}

define('LOGGED_IN', array_key_exists('loggedin', $_SESSION) && $_SESSION['loggedin'] == true);
define('CAN_LIST', true);
define('CAN_READ', true);
define('CAN_WRITE', LOGGED_IN);

?><!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<title>Doodlebot</title>
		<link rel="stylesheet" type="text/css" href="style.css" />
	</head>
	<body>
		<?php
		
		echo '<form method="post" action="">';
			if ( LOGGED_IN ){
				echo '<input type="submit" name="logout" value="Log out" />';
			}
			else{
				echo '<input type="text" name="username" />';
				echo '<input type="password" name="password" />';
				echo '<input type="submit" name="login" value="Log in" />';
			}
		echo '</form>';
		
		if ( CAN_READ && $_GET['edit'] ){
			$moduleName = $_GET['edit'];
			
			if ( CAN_WRITE && $_POST['source'] ){
				$moduleSource = $_POST['source'];
				setModuleSource($moduleName, $moduleSource);
			}
			else
				$moduleSource = getModuleSource($moduleName);
			
			echo '<h2>', htmlentities($moduleName), '</h2>';
			echo '<form method="post" action="">';
				echo '<textarea name="source">, htmlentities($moduleSource), </textarea>';
				echo '<input type="submit" value="Save" />';
			echo '</form>';
		}
		elseif ( CAN_LIST ){
			$moduleNames = getModuleNames();
			echo '<ul>';
			foreach ( $moduleNames => $moduleName ){
				echo '<li>', htmlentities($moduleName), '</li>';
			}
			echo '</ul>';
		}
		
		?>
	</body>
</html>
