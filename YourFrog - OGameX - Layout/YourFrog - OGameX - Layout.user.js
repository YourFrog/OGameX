// ==UserScript==
// @name     YourFrog - OGameX - Layout
// @version  1
// @include  *hyper.ogamex.net/*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// ==/UserScript==


$(document).ready(function() {
  
  // Two Columns
  $('#header').css('background-position-x', '8px').css('left', '100px');
  $('#game-container').css('width', '1200px');
  $('#game-bottom').css('width', '1200px');
  
  $('#planet-selection').css('width', '347px');
  $('#other-planets').css('display', 'flex').css('flex-wrap', 'wrap').css('justify-content', 'space-between').css('align-items', 'stretch')
    .css('row-gap', '0.875rem')
    .css('column-gap', '0.875rem');
	$('.planet-item').css('flex', '0 0 45%');
  
  $('.planet-item').css('border', '1px solid white');
  $('#planet-selection').css('top', '50px');
  $('#left-menu-1').css('position', 'relative').css('top', '50px');
});