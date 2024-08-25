// ==UserScript==
// @name     YourFrog - OGameX - OnlineBonus
// @version  1
// @include  *https://hyper.ogamex.net/*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @require https://github.com/YourFrog/OGameX/raw/main/YourFrog%20-%20OGameX%20-%20Communicate/YourFrog%20-%20OGameX%20-%20Communicate.user.js
// @grant           GM.setValue
// @grant           GM.getValue
// @grant    GM.setClipboard
// @grant window.close
// @grant window.focus
// ==/UserScript==

var lastReceived = -1
      

/****************/
/*							*/
/*	Ustawienia	*/
/*							*/
/****************/
const settings = {
	// Czas jaki skrypt oczekuje przed kliknięciem w guzik
  clickDelay: 10 * 1_000,
  
  // Czas co jaki pojawia się guzik
	spawnInterval: 3 * 60 * 60 * 1_000,
  
  // Ile czasu dodajemy do spawnu
  spawnOffset: 5 * 60 * 1_000
}

$(document).ready(function() {
  (async() => {
   	lastReceived = await GM.getValue("lastReceived", -1) 
    
  	let isOnlineBonusPage = location.pathname == "/home/onlinebonus"

    let element = $('#left-menu-1 a.text-item:contains("Online bonus")')
    let isExists = element.length == 1

    if (isOnlineBonusPage) {
      refreshTimer()  
    }

    if (isExists) {
      clickWithDelay(element)
    } else {

      refreshPage() 
    }
  })() 
})

/**
 *	Zaaktualizowanie licznika czasu kliknięcia
 */
function refreshTimer() {
  let element = $('.content td:contains("There is currently no online bonus available.")')
  let isExists = element.length >= 1;
  
  if (!isExists) {
    (async() => {
      lastReceived = now()
      await GM.setValue("lastReceived", lastReceived)
    })()
  }
}

/**
 *	Kliknięcie przycisku od bonusu z opóźnieniem 30 sekund
 */
function clickWithDelay(element) {
  setTimeout(function() {
  	$(element)[0].click()
  }, settings.clickDelay)
}

/**
 *	Odświeżenie strony po upływie określonej ilości czasu w zależności od tego kiedy ma pojawić się guzik
 */
function refreshPage() {
  let delay = settings.spawnInterval + settings.spawnOffset
      
  if (lastReceived != -1) {
		let candidate = settings.spawnInterval - (now() - lastReceived)
    
    if (candidate > -1) {
			delay = candidate + settings.spawnOffset
    } else {
      delay = settings.spawnOffset
    }
  }
  
  Logger.add("Online bonus " + unsafeWindow.ConvertToDateString(delay / 1000), 20_000)
 	setTimeout(function() {
    location.reload()
  }, delay)
}

/**
 *	Podanie aktualnego czasu
 */
function now() {
	return (new Date()).getTime()  
}
