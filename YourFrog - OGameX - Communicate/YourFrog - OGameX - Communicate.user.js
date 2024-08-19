// ==UserScript==
// @name     YourFrog - OGameX - Communicate
// @version  1
// @include  *https://hyper.ogamex.net/*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @grant           GM.setValue
// @grant           GM.getValue
// @grant    GM.setClipboard
// @grant window.close
// @grant window.focus
// ==/UserScript==

const Logger = {
  /**
   *	Podpięcie mechanizmu do ekranu
   */
  initialize: function() {
    $('body').append(`
      <ul id="yourfrog-message-box"></ul>

      <style>
        #yourfrog-message-box {
          position: fixed;
          right: 5px;
          bottom: 5px;
        }

        #yourfrog-message-box > li {
          background-color: black;
          color: lime;
          padding: 3px;
          font-size: 11px;
        }
      </style>
    `)
  },
  
  /**
   *	Dodanie wiadomości do wyświetlenia
   */
	add: function(message, displayTime = 2_000) {
   	$('#yourfrog-message-box').append('<li data-left="' + displayTime + '">' + message + '</li>') 
  },
  
  /**
   *	Uruchomienie licznika
   */
  start: function() {
    let interval = 250
    
    setInterval(function() {
      $('#yourfrog-message-box > li:visible').each(function() {
        let value = parseInt($(this).data('left')) - interval

        if (value < 0) {
          $(this).remove() 
        } else {
          $(this).data('left', value)
        }
      })
    }, interval)
  }
}

$(document).ready(function() {
  Logger.initialize()
  Logger.start()
});