<?php

require_once('config.php');

function startsWith($haystack, $needle)
{
    $length = strlen($needle);
    return $length == 0 || (substr($haystack, 0, $length) === $needle);
}

function endsWith($haystack, $needle)
{
    $length = strlen($needle);
    return $length == 0 || (substr($haystack, -$length) === $needle);
}

function getModuleNames(){
	$h = opendir(DOODLE_MODULE_DIR);
	if ( $h === false )
		return false;
	
	$names = array();
	while ( ($fname = readdir($h)) !== false ){
		if ( endsWith($fname, '.js') )
			$names []= substr($fname, 0, strlen($fname)-3);
	}
	return $names;
}

function getModuleFilename($name){
	$name = str_replace(array('/', '\\', '.'), '', $name);
	$fname = realpath(DOODLE_MODULE_DIR + '/' + $name);
	if ( startsWith($fname, DOODLE_MODULE_DIR) )
		return $fname;
	return false;
}

function getModuleSource($name){
	$fname = getModuleFilename($name);
	if ( $fname )
		return file_get_content($fname);
	return false;
}

function setModuleSource($name, $source){
	$fname = getModuleFilename($fname);
	if ( $fname ){
		file_put_content($fname, $source);
		return true;
	}
	return false;
