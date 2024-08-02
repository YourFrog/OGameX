// ==UserScript==
// @name     YourFrog - OGameX - Galaxy
// @version  1
// @include  *https://hyper.ogamex.net/galaxy*
// @include  *https://hyper.ogamex.net/messages*
// @include  *https://hyper.ogamex.net/fleet*
// @include  *https://hyper.ogamex.net/home/playerprofile*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @grant           GM.setValue
// @grant           GM.getValue
// @grant    GM.setClipboard
// @grant window.close
// @grant window.focus
// ==/UserScript==

/************************************************/
/*                                              */
/*					=== Stałe, nie ruszać ===						*/
/*																							*/
/************************************************/
const ObjectType = {
	PLANET: "planet",
  MOON: "moon",
  DEEP_SPACE: "deep_space",
  ASTEROID: "asteroid",
  UNKNOWN: "unknown"
}

let dataOfGalaxy = {}
let asteroids = {}
let autoFarm = 0

/************************************************/
/*                                              */
/*						=== Konfiguracja ===							*/
/*																							*/
/************************************************/
const settings = {
  /************************************************/
  /*                                              */
  /*						=== Flota ===								 	*/
  /*																							*/
  /************************************************/
  fleet: {
    // Ilość dostępnych slotów
    slots: 47
  },
  galaxy: {
    highlights: {
      	debris: {
          // Przy jakiej ilości metalu + kryształu podświetli sie pole (bez przelicznika 3:2:1)
          all: 2_000_000_000,
          
          // Przy jakiej ilości metalu podświetli sie pole
         	metal: 1_000_000_000,
          
          // Przy jakiej ilości kryształu podświetli sie pole
          crystal: 1_000_000_000
        }
    },
    farm: {
     	minimum_ranking: 1600,
      
      // Ile statków per slot
      ships: 150_000,

      // Minimalna ilość surowców na farmie którą atakujemy
      minimum_resource: 5_000_000_000
    },
    /************************************************/
    /*                                              */
    /*						=== Asteroidy ===								 	*/
    /*																							*/
    /************************************************/
    asteroid: {
      // Maksymalna ilość statków jaka może zostać wysłana
      ships: 29_000_000,
      
      // Maksymalna ilość misji w powietrzu
      maximumFleets: 5,
      
      // Informacje o obiekcie z którego będą wysyłane statki
      source: { 
        // Współrzędne planety, Format: {system}:{układ}:{pozycja}
        coordinates: "1:287:9", 

        // Enum: ObjectType
        type: ObjectType.PLANET
      }
    }
  },
  colors: {
  	metal: "#ffaacca1",
    crystal: "#73e5ffc7",
    highlights: "gold"
  }
}

let scanerHandler = null;

/************************************************/
/*                                              */
/*							=== nie ruszać ===	  					*/
/*																							*/
/************************************************/

const STATE_NOTHING = 0
const STATE_SEND_MINNERS = 1
const STATE_UPDATE_STATISTICS_ASTEROID = 2
const STATE_AUTO_SEND_MINNERS = 3

////
// Allow state:
// - 0 -> Nothing
// - 1 -> Go to Distribute
// - 2 -> Automatic send resource when have
let state = STATE_NOTHING


/************************************************/
/*                                              */
/*						=== EOF: nie ruszać ===	  				*/
/*																							*/
/************************************************/

function utils_getCurrentCoordinates() {
	return $('a.planet-select.selected span.planet-coords').clone().children().remove().end().text().trim();  
}

/**
 *	Sprawdzenie czy w układzie znajduje się asteroida
 */
function systemHasAsteroid() {
  return $('.galaxy-item .btn-asteroid').length == 1
}

/**
 *	Sprawdzenie czy w układzie znajduje się duża ilość debisu
 */
function systemHasHugeDebris() {
    let result = false
    
    $('#galaxyContent .galaxy-item').each(function() {
      let debris = {
      	metal: 0,
        crystal: 0,
        deuter: 0
      }
      
      let tooltipDiv = $('.col-debris .tooltip_sticky', this)
			let tooltipContent = tooltipDiv.data('tooltip-content')
      
      $('.clearFix', tooltipContent).each(function() {
        	let element = $('div', this)
        
          if (element.length == 0) { return }
        
        	let isMetal = $(element).attr('style').includes('metal.png')
        	let isCrystal = $(element).attr('style').includes('crystal.png')
          let value = parseInt($('span', this).text().replaceAll(".", ""))
          
          if (isMetal) { debris.metal = value }
        	if (isCrystal) { debris.crystal = value }
      })
      
      let isHighlights = false
      
      if (settings.galaxy.highlights.debris.metal < debris.metal) { isHighlights = true }
      if (settings.galaxy.highlights.debris.crystal < debris.crystal) { isHighlights = true }
      if (settings.galaxy.highlights.debris.all < debris.metal + debris.crystal) { isHighlights = true }
      
      if (isHighlights) {
        result = true
      }
    })
  
                                          
    return result
}

async function savePlanetsData(planets) {
  for(index in planets) {
    let item = planets[index]
    
  	dataOfGalaxy[item.cords] = item
  }
  
  let serializeObj = JSON.stringify(dataOfGalaxy);
  await GM.setValue('galaxy', serializeObj);
}

async function exportGalaxy() {
    let serialize = await GM.getValue('galaxy', '{}');
    let obj = JSON.parse(serialize)

    let result = "Galaktyka;System;Układ;Ranking;Planeta;Gracz;Sojusz;Protection;Inactive 7 days;Inactive 28 days;Vacation;Data od aktualizacji (od: " + (new Date()).toISOString() + "\n"
    
    const ordered = Object.keys(obj).sort().reduce(
      (n, key) => { 
        n[key] = obj[key]; 
        return obj;
      }, 
      {}
    );

    for(cords in ordered) {
      item = obj[cords]
      
      let split = cords.split(":")
      
      if (split[1] == 145) {
      	console.log(item)
      }
      
     	result += split[0] + ";"
      result += split[1] + ";"
      result += split[2] + ";"
      result += item.ranking + ";" 
      result += item.planet_name + ";" 
      result += item.player_name + ";" 
      result += item.alliance + ";" 
      result += (item.is_protection ? '1' : '0') + ";" 
      result += (item.is_inactive7 ? '1' : '0') + ";" 
      result += (item.is_inactive28 ? '1' : '0') + ";" 
      result += (item.is_vacation ? '1' : '0') + ";" 
      result += ((new Date()).getTime() - item.update_time) + "\n" 
    }
    
  GM.setClipboard(result);
  alert('Skopiowano')
}

/**
 *	Uruchomienie skryptu
 */
async function runScript() {
	let serialize = await GM.getValue('asteroids', '{}');
  asteroids = JSON.parse(serialize)

  autoFarm = await GM.getValue('auto-farm', 0);
  
  $('#left-menu-1').prepend(`
    <div class="menu-item" style="margin-bottom: 30px;">
      <a href="#" class="text-item" style="color:#4caf50;" id="yourfrog-miners">Send miners</a>
    </div>
  `)
  
  let suffix = "off"
  
  if (await EasyOGameX.Data.Bot.Farming.isAutoMiners()) {
  	suffix = "on"    
  }
  
  $('#left-menu-1').prepend(`
    <div class="menu-item" style="margin-bottom: 30px;">
      <a href="#" class="text-item" style="color:#4caf50;" id="yourfrog-auto-miners">Auto miners: ` + suffix + `</a>
    </div>
  `)
  
  $('#left-menu-1').append(`
    <div class="menu-item">
      <a href="#" class="text-item" style="color:#4caf50;" id="yourfrog-export">Export Galaxy</a>
    </div>
  `)
  
  $('.galaxy-route').append(`
		<div style="float:right;padding:2px;border:1px solid rgb(43,63,90);border-left:2px solid rgb(43,63,90);">
			<a href="#" class="btn-route" style="padding:0px 10px;border-radius:0px;color: #0A0;font-weight: bold;" id="yourfrog-scan-galaxy">Galaxy scan</a>
		</div>
  `)
  
  $('.galaxy-route').append(`
		<div style="float:right;padding:2px;border:1px solid rgb(43,63,90);border-left:2px solid rgb(43,63,90);">
			<a href="#" class="btn-route" style="padding:0px 10px;border-radius:0px;color: #0A0;font-weight: bold;" id="yourfrog-scan-asteroid">Asteroid scan</a>
		</div>
  `)
  
  $('.galaxy-route').append(`
		<div style="float:right;padding:2px;border:1px solid rgb(43,63,90);border-left:2px solid rgb(43,63,90);">
			<a href="#" class="btn-route" style="padding:0px 10px;border-radius:0px;color: #0A0;font-weight: bold;" id="yourfrog-scan-debris">Debris scan</a>
		</div>
  `)
  
  setInterval(() => {
    let exists = $('#yourfrog-review-espionage').length == 1
        
    if (!exists) {
      $('.message-area').prepend(`
        <div style="float:right;padding:2px;border:1px solid rgb(43,63,90);border-left:2px solid rgb(43,63,90);">
          <a href="#" class="btn-route" style="padding:0px 10px;border-radius:0px;color: #0A0;font-weight: bold;" id="yourfrog-review-espionage">Review Espionage</a>
        </div>
      `)
    }
  }, 500)
  
  $(document).on('click', '#yourfrog-miners', (event) => {
    event.preventDefault()
    
    EasyOGameX.Script.Galaxy.runAsteroidFarming()
  })
  
  $(document).on('click', '#yourfrog-auto-miners', (event) => {
    (async() => {
      await EasyOGameX.Data.Bot.Farming.toggleAutoMiners()    
      EasyOGameX.Navigator.goToPage('/galaxy', STATE_NOTHING)
    })()
  })
  
  // Przejrzenie wszystkich raportów szpiegowskich
  $(document).on('click', '#yourfrog-review-espionage', function() {
    let elements = $('a.btn-report-more-info');
    let size = elements.length
        
    elements.each((index, element) => {
      setTimeout(() => {
        $(element)[0].click();
      }, index * 2000)
    });
    
    setTimeout(() => { alert("Skończyłem"); }, elements.length * 2000)
  });
  
  $(document).on('click', '#yourfrog-export', function() {
	    (async() => {
    		exportGalaxy()
      })()
  })
  
  $(document).on('click', '#yourfrog-scan-galaxy', function(event) {
    event.preventDefault()
    
    if (scanerHandler == null) {
      scanerHandler = setInterval(function() {
    		utils_UpdateGalaxySystem()
        let isLoader = $('#BackGroundFreezerPreloader_Element').length == 1
        let system = $('#systemInput').val()

        if (isLoader) { 
          return false; 
        }
        
        if (system < 499) {
          $('#btnSystemRight')[0].click();
        }
      }, 500)
    } else {
     clearInterval(scanerHandler); 
      scanerHandler = null
    }
  })
  
  $(document).on('click', '#yourfrog-scan-asteroid', function(event) {
    event.preventDefault()
    
    EasyOGameX.Script.Galaxy.runAsteroidScanner()
    
//     if (scanerHandler == null) {
//       scanerHandler = setInterval(function() {
//         let hasAsteroid = systemHasAsteroid()
//         let isLoader = $('#BackGroundFreezerPreloader_Element').length == 1
        
//         if (isLoader) { 
//           return false; 
//         }
        
//         if (hasAsteroid) {
//           clearInterval(scanerHandler); 
//           scanerHandler = null
//         } else {
//           let system = $('#systemInput').val()

//           if (system < 499) {
//             $('#btnSystemRight')[0].click();
//           }
//         }
//       }, 100)
//     } else {
//      	clearInterval(scanerHandler); 
//       scanerHandler = null
//     }
  })
  
  $(document).on('click', '#yourfrog-scan-debris', function(event) {
    event.preventDefault()
    
    if (scanerHandler == null) {
      scanerHandler = setInterval(function() {
        let hasDebris = systemHasHugeDebris()
        let isLoader = $('#BackGroundFreezerPreloader_Element').length == 1
        
        if (isLoader) { 
          return false; 
        }
        
        if (hasDebris) {
          clearInterval(scanerHandler); 
          scanerHandler = null
        } else {
          let system = $('#systemInput').val()

          if (system < 499) {
            $('#btnSystemRight')[0].click();
          }
        }
      }, 100)
    } else {
     	clearInterval(scanerHandler); 
      scanerHandler = null
    }
  })
  
  $(document).on('click', '.asteroid-item', function(event) {
    	event.preventDefault();
    	
    	(async() => {
        let galaxy = $(this).data('galaxy')
        let system = $(this).data('system')
        let position = 17
        
        
        asteroids[galaxy + ":" + system].is_send = true;
        asteroids[galaxy + ":" + system].sendAt = (new Date()).getTime();
        
        
        (async() => {
  				let serializeObj = JSON.stringify(asteroids);
        	await GM.setValue('asteroids', serializeObj);
          
          $('span', this).css('color', 'orange');

          let url = $(this).attr('href')
          window.open(url, '_blank').focus();
        })()
      })()
  })
  
  /**
   *	Wyliczenie ilości slotów które można wykorzystać do atakowania
   */
  function countPossibleSlotsForAttack() {
    	let availableSlots = parseInt(settings.fleet.slots)
      let actualMovements = parseInt($('#fleet-movement-detail-btn span:contains("Own")').text().split(' ')[0])
        
    	return availableSlots - actualMovements - 1  
  }
  
  // Automatyczne wysyłanie skanów do farm które nie skanowano od 1h
  $(document).on('click', '[data-auto-scan]', function(event) {
    	event.preventDefault();
    
      let max = countPossibleSlotsForAttack()
      let interval = 1_000
      
      
      let elements = $('[data-allow-auto-scan="1"]').filter(function() {
        let galaxy = $(this).data('galaxy')
        let system = $(this).data('system')
        let position = $(this).data('position')

        let coordinate = galaxy + ":" + system + ":" + position

        let now = (new Date()).getTime()
        let farm = dataOfGalaxy[coordinate]


        if (typeof farm.espionage != 'undefined') {
          let difference = farm.espionage.updateAt

          if (difference <= 60 * 60 * 1000) {
            return false 
          }
        }

        return true
      })
      
      for(let i = 0; i < max; i++) {
        setTimeout(() => {
          $('[data-auto-scan]').text('Auto scan ' + (i + 1) + ' z ' + max)
          
          let element = elements[i]
          $(element).attr('data-allow-auto-scan', 0).css('color', 'black')
	        $(element).parent().find('.btnActionSpy')[0].click()
        }, i * 1000)
      }
    
    setTimeout(() => {
      alert('Zakonczono')
    }, max * 1000)
  })
  
  
  // Farmienie gdzie jako podstawa służy ilość surowców
  $(document).on('click', '[data-auto-farm="2"]', function(event) {
    let mainElement = $(this)
      
    autoAttack(mainElement, (index, element) => {
      	let resource = $(element).data('resource')

      	return resource > settings.galaxy.farm.minimum_resource
    }, (a, b) => { 
        let aCoordinate = a.getAttribute('data-coordinate');
        let bCoordinate = b.getAttribute('data-coordinate');

      	let aSum = getSumOfResourceOnPlanetFromEspionage(aCoordinate)
        let bSum = getSumOfResourceOnPlanetFromEspionage(bCoordinate)
        
        if (aSum == -1 && bSum == -1) {
         	return 0 
        }
      
        $(a).attr('resource', aSum)
        $(b).attr('resource', bSum)
      
      	if (aSum > bSum) { return -1; }
      
      	return 1;
    }, (left, allSize) => "Auto Farm by distance (" + left + " / " + allSize + ")")
  })
  
  // Farmienie gdzie jako podstawa służy dystans
  $(document).on('click', '[data-auto-farm="1"]', function(event) {
    let mainElement = $(this)
      
    autoAttack(mainElement, (index, element) => {
      return true
    }, (a, b) => { 
        let aVal = parseInt(a.getAttribute('data-distance'));
        let bVal = parseInt(b.getAttribute('data-distance'));

        return aVal - bVal;  
    }, (left, allSize) => "Auto Farm by distance (" + left + " / " + allSize + ")")
  })
  
  function autoAttack(mainElement, filtrBy, sortBy, labelCallback) {
      let max = countPossibleSlotsForAttack()
      let interval = 5_000

      let allElements = $(
        								$('.attack-item[data-allow-auto-farm]')
                       	 .filter(filtrBy)
            	           .toArray()
              	         .sort(sortBy)
                      )
      
    	let sortList = allElements
      								.getRange(0, max - 1)
      								.reverse();
    
    	if (sortList.length <= 0) {
        alert('Brak farm spełniającyh kryteria')
        return true
      }
    
 	    //Zabezpieczenie przed próbą obróbki zbyt dużej ilości linków
    	max = Math.min(max, sortList.length);

    	for(let i = 0; i < max; i++) {
        setTimeout(function() {        
          $(mainElement).css('color', 'orange').text(labelCallback(max - i, allElements.length));

          (async() => { 
            await GM.setValue('auto-farm', 1);
            let element = $(sortList).eq(i)//$('.attack-item[data-allow-auto-farm]').eq(0)          

            $(element).removeAttr('data-allow-auto-farm')
            $(element).trigger('click')

          })();
        }, i * interval)
      }
    
    setTimeout(function() {
      console.log(mainElement)
      $(mainElement).css('color', 'white')
    }, max * interval)
  }
  
  $(document).on('click', '.attack-item', function(event) {
    	event.preventDefault();
    	
    	(async() => {
        let galaxy = $(this).data('galaxy')
        let system = $(this).data('system')
        let position = $(this).data('position')

        let cords = galaxy + ":" + system + ":" + position

        let serialize = await GM.getValue('galaxy', '{}');
        let data = JSON.parse(serialize)

        let item = data[cords]
        
        item.last_attack = (new Date()).getTime()

        $('span', this).css('color', 'orange');

        let url = $(this).attr('href')
        console.log("open url: " + url)
        window.focus()
        window.open(url, '_blank').focus();
        
        let serializeObj = JSON.stringify(data);
        await GM.setValue('galaxy', serializeObj);
      })()
  })
  
  
         
  
  $(document).on('click', '.item-low-farm', function(event) {
    	event.preventDefault();
    
    	(async() => {    
	      let serialize = await GM.getValue('galaxy', '{}');
  	    let data = JSON.parse(serialize)
        
        let galaxy = $(this).data('galaxy')
        let system = $(this).data('system')
        let position = $(this).data('position')
        
        let cords = galaxy + ":" + system + ":" + position

        data[cords].isLowFarm = true
       
        let serializeObj = JSON.stringify(data);
        await GM.setValue('galaxy', serializeObj);
        
        alert("Gracz oznaczony jako słaba farma")
      })()
    	
  })
  
  $(document).on('click', '.item-high-farm', function(event) {
    	event.preventDefault();
    
    	(async() => {    
	      let serialize = await GM.getValue('galaxy', '{}');
  	    let data = JSON.parse(serialize)
        
        let galaxy = $(this).data('galaxy')
        let system = $(this).data('system')
        let position = $(this).data('position')
        
        let cords = galaxy + ":" + system + ":" + position

        data[cords].isLowFarm = false
       
        let serializeObj = JSON.stringify(data);
        await GM.setValue('galaxy', serializeObj);
        
        alert("Gracz oznaczony jako Dobra farma")
      })()
    	
  })
  
  $(document).on('click', '.item-normal-farm', function(event) {
    	event.preventDefault();
    
    	(async() => {    
	      let serialize = await GM.getValue('galaxy', '{}');
  	    let data = JSON.parse(serialize)
        
        let galaxy = $(this).data('galaxy')
        let system = $(this).data('system')
        let position = $(this).data('position')
        
        let cords = galaxy + ":" + system + ":" + position

        data[cords].isLowFarm = undefined
       
        let serializeObj = JSON.stringify(data);
        await GM.setValue('galaxy', serializeObj);
        
        alert("Gracz oznaczony jako neutralna farma")
      })()
    	
  })
  
  let isGalaxyPage = location.pathname == "/galaxy"
  let isMessagePage = location.pathname == "/messages"
  let isFleetPage = location.pathname == "/fleet"
  let isProfilePage = location.pathname == "/home/playerprofile"
  
  if (isGalaxyPage) {
    setInterval(function() {
      utils_UpdateGalaxySystem()
    }, 100)  
    
    switch(true) {
      case await EasyOGameX.State.is(STATE_NOTHING):
        
        switch(true) {
          case await EasyOGameX.Data.Bot.Farming.isAutoMiners():
            	setTimeout(() => {
                $('#yourfrog-miners')[0].click()
              }, 2000)
            
            
            	setTimeout(() => {
               	window.location.reload(); 
              }, 2 * 60 * 1000)
            break;
        }
        
        break;
    }
  }
  
	if (isMessagePage) {        
    setInterval(function() {
      (async() => {
        utils_UpdateCombatMessages()
      })()
    }, 1000)
    
    
    // Automatyczne oznaczanie farm na podstawie raportów szpiegowskich
    setInterval(() => {
      let headerElement = $('h2#ajax-modal-title')
      let isEspinageReport = $('h2#ajax-modal-title:contains("Espionage report details")').length == 1

      if (isEspinageReport) {
        let metalStorageLevel = $('main#ajax-modal-content div.header:contains("Buildings")').parent().find('.content span:contains("Metal Storage")').parent().find('span:last').text()
        let fullname = $('div#spy-report-modal > div > div:contains("Espionage report from") > a').text()
        
        if (fullname == "") {
          // Jak użytkownik przełącza się pomiędzy raportami to zdarza się że nazwa jest pusta
        	return  
        }
        
        let coordinate = fullname.split('[')[1].split(']')[0]
        let farm = dataOfGalaxy[coordinate]

        if (typeof farm == 'undefined') {
          console.log('Nie rozpoznana farma')
          return;
        }
        
        let fleetElement = $('#spy-report-modal .header:contains("Ships") > span')
        let defenseElement = $('#spy-report-modal .header:contains("Defenses") > span')
              
        if (fleetElement.length == 0 || defenseElement.length == 0) {
          headerElement.css('color', 'pink')
          farm.isLowFarm = undefined
          savePlanetsData(farm)
          return
        }
        
        let hasFleet = $(fleetElement).text() != "0"
        let hasDefense = $(defenseElement).text() != "0"
        
        
        if (hasFleet) {
          headerElement.css('color', 'red')
          farm.isLowFarm = true
        	console.log("Na planecie znajduje się flota")
          savePlanetsData(farm)
          return;
        }
        
        if (hasDefense) {
          headerElement.css('color', 'red')
          farm.isLowFarm = true
         	console.log("Na planecie znajduje się obrona")
          savePlanetsData(farm)
          return;
        }
        
        if (metalStorageLevel == "") {
          headerElement.css('color', 'pink')
          farm.isLowFarm = undefined
        	console.log("Brak informacji o magazynie")
          savePlanetsData(farm)
          return
        }
        
        if (metalStorageLevel >= 15) {	
          farm.isLowFarm = false
          farm.espionage = {
            updateAt: (new Date()).getTime(),
            building: {
              storage: {
               	metal: metalStorageLevel 
              }
            },
            resource: {
              metal: parseInt($('main#ajax-modal-content div.header:contains("Resources")').parent().find('.content > div > div:eq(0)').text().split(":")[1].trim().replaceAll(".", "")),
              crystal: parseInt($('main#ajax-modal-content div.header:contains("Resources")').parent().find('.content > div > div:eq(1)').text().split(":")[1].trim().replaceAll(".", "")),
              deuter: parseInt($('main#ajax-modal-content div.header:contains("Resources")').parent().find('.content > div > div:eq(2)').text().split(":")[1].trim().replaceAll(".", ""))
            }
          }
          
          console.log("Farm", farm)
         	headerElement.css('color', 'lime')
        } else {	 
          farm.isLowFarm = true
          headerElement.css('color', 'red')
        }
        
        savePlanetsData(farm)
        console.log("Zakończyłem")
      }
    }, 1000)
  }
  
  if (isProfilePage) {
    switch(true) {
      case await EasyOGameX.State.is(STATE_UPDATE_STATISTICS_ASTEROID):
     			await EasyOGameX.Script.Profile.updateStatistics()
          
        	let extra = await EasyOGameX.State.extra()
        	EasyOGameX.Navigator.goToPage('/fleet', STATE_SEND_MINNERS, extra)
        break;
    }
  }
  
  if (isFleetPage) {
    
    if (EasyBrowser.urlParameterExists("fleetSendSuccessfully") && await EasyOGameX.State.is(STATE_SEND_MINNERS)) {
      await EasyOGameX.State.reset()
			EasyOGameX.Navigator.goToPage('/galaxy')
    }
    
    // Uruchomienie automatycznego wysyłania minerów
    if (await EasyOGameX.State.is(STATE_SEND_MINNERS)) {
      let imageElement = $('[data-ship-type="ASTEROID_MINER"]')
      
      let todayMissions = await EasyOGameX.Data.Account.Asteroids.countToday()
      let normalizeTodayMissions = todayMissions > 30 ? 30 : todayMissions
          
    	let percent = normalizeTodayMissions * 2 / 100.0
      
      let ships = parseInt(settings.galaxy.asteroid.ships * (1 - percent))
      let maximumShips = parseInt(imageElement.attr('data-ship-quantity'))
      
      if (ships > maximumShips) {
       	alert("Zbyt mało statków na planecie. Brakuje: " + (ships - maximumShips))
      	await EasyOGameX.State.reset()
        return
      }
      
      let parent = imageElement.parent()
      
      // Krok 1
      let element = $('input', parent).val(ships)
      $('#btn-next-fleet2').removeClass('disabled')

      await EasySelenium.waitForElement('#btn-next-fleet2:not(.disabled)')
      
      $('#btn-next-fleet2')[0].click();
      
      
      // Krok 2
      let extra = await EasyOGameX.State.extra()
      
      $('#fleet2_target_y').focus().val(extra.system)
      $('#fleet2_target_z').focus().val(17)
      
      // Przejdź do kroku 3
      await EasySelenium.waitForElement('#btn-next-fleet3')
      $('#btn-next-fleet3')[0].click();
      
      // Krok 3
      await EasySelenium.waitForElement('.mission-item.ASTEROID_MINING.selected')
      await EasySelenium.waitForElement('#btn-submit-fleet')
      
      // Oznaczamy asteroide jako "wysłaną"
      asteroids[extra.galaxy + ":" + extra.system].is_send = true;
      asteroids[extra.galaxy + ":" + extra.system].sendAt = (new Date()).getTime();
      
      let serializeObj = JSON.stringify(asteroids);
      await GM.setValue('asteroids', serializeObj);
      
      // Klikamy guzik od wysyłki
      $('#btn-submit-fleet')[0].click();
    }
        
    switch(autoFarm) {
      case 2:
        await GM.setValue('auto-farm', 0);
    		window.open('', '_self', '');
    		window.close();
      break;
      
      case 1:
        console.log('auto farm')
        await GM.setValue('auto-farm', 2);

        let parent = $('[data-ship-type="LIGHT_CARGO"]').parent()
        let element = $('input', parent).val(settings.galaxy.farm.ships)

        $('#btn-next-fleet2').removeClass('disabled')

        $('#btn-next-fleet2')[0].click();
        $('#btn-next-fleet3')[0].click();

        setTimeout(function() {
          (async() => {
            await EasySelenium.waitForElement('.mission-item.ATTACK.enabled.selected');
            $('#btn-submit-fleet')[0].click();
        	})()
        }, 1000)
    	break;
    }
  }
}


/**
 *	Zwraca ilość surowców znajdujących się na planecie
 */
function getSumOfResourceOnPlanetFromEspionage(coordinate) {
  let farm = dataOfGalaxy[coordinate]

  if (typeof farm.espionage == 'undefined') {
    return -1
  }

  let now = (new Date()).getTime()
  let diff = now - farm.espionage.updateAt
  let max = 30 * 60 * 1000


  if (diff > max) {
    return -1
  }

  let resource = farm.espionage.resource

  return parseInt(parseInt(resource.metal) + parseInt(resource.crystal) * 1.5 + parseInt(resource.deuter) * 3)
}


$(document).ready(function() {
  

(function($) {
  //function that gets a range of dom elements against a jQuery selector
  //returns an array of dom elements
  $.fn.getRange = function(start, end) {
    let elems = [];
    
    for (let i = start; i <= end; i++) {
      let item = this.get(i)
      
      if (typeof item != 'undefined') {
      	elems.push(this.get(i));
      }
    }
    
    return elems;
  };
})(jQuery);
  
  (async() => {
    let serialize = await GM.getValue('galaxy', '{}');
    dataOfGalaxy = JSON.parse(serialize)
    
    runScript()
  })()
});

async function utils_UpdateCombatMessages() {
  $('[data-msg-template="FLEET_BATTLE_REPORT"]').each(function() {
    let hasLowFarm = $('.item-low-farm', this).length > 0
    let hasHighFarm = $('.item-high-farm', this).length > 0
          
    if (hasLowFarm || hasHighFarm) {
    	return  
    }
    
    let normalizeCords = $('span:contains("Combat report:") a', this).text().split('[')[1].split(']')[0]
    let split = normalizeCords.split(':')
    
    let type = "low";
    let farm = dataOfGalaxy[normalizeCords]
    
    let isNormalFarm = typeof farm.isLowFarm === 'undefined'
        
    let content = ''
    
    if (!isNormalFarm) {
	    content += `
    		<a href="#" class="item-normal-farm" data-galaxy="` + split[0] + `" data-system="` + split[1] + `" data-position="` + split[2] + `" style="color: white">Oznacz jako zwykła farma</a>
    	`
    }
    
    if (isNormalFarm || farm.isLowFarm === true) {
      content += `
    		<a href="#" class="item-high-farm" data-galaxy="` + split[0] + `" data-system="` + split[1] + `" data-position="` + split[2] + `" style="color: lime">Oznacz jako dobra farma</a>
      `
    }
    
    if (isNormalFarm || farm.isLowFarm === false) {
      content += `
    		<a href="#" class="item-low-farm" data-galaxy="` + split[0] + `" data-system="` + split[1] + `" data-position="` + split[2] + `" style="color: orange">Oznacz jako słaba farma</a>
      `;
    } 
    
    $('.message-actions', this).append(content)
  })
}

function utils_UpdateGalaxySystem() {    
  	if ($('.galaxy-info.scan').length == 1) {
      return
    }
  
  	$('.galaxy-info').addClass('scan')
    let planets = []
    
    $('#galaxyContent .galaxy-item').each(function() {
      let galaxy = $('#galaxyInput').val()
      let system = $('#systemInput').val()
      let position = $('.planet-index', this).text()
          
      let isHead = $(this).hasClass('galaxy-item-head')
      if (isHead) { return }
      
      if (position == 16) { return }
      if (position == 17) { 
      	// Aktualizujemy dane o asteroidzie
        let asteroidIndex = galaxy + ":" + system
            
        let now = (new Date()).getTime()
        let seconds = $('.btn-asteroid span').data('asteroid-disappear')
        
        let oldItem = asteroids[asteroidIndex]
        
        switch(true) {
          case (typeof seconds == 'undefined'): asteroids[asteroidIndex] = undefined; break;
          case (typeof oldItem == 'undefined'): asteroids[asteroidIndex] = {
                is_send: false,
                galaxy: galaxy,
                system: system,
                left: seconds,
                updateAt: now  
              };
            break;
          default:
            oldItem.left = seconds
            oldItem.updateAt = now
        }
        
        (async() => {
  				let serializeObj = JSON.stringify(asteroids);
        	await GM.setValue('asteroids', serializeObj);
        })()
        
        return 
      }

      let tooltipDiv = $('.col-debris .tooltip_sticky', this)
			let tooltipContent = tooltipDiv.data('tooltip-content')
      
      let debris = {
      	metal: 0,
        crystal: 0,
        deuter: 0
      }
      
      $('.clearFix', tooltipContent).each(function() {
        	let element = $('div', this)
        
          if (element.length == 0) { return }
        
        	let isMetal = $(element).attr('style').includes('metal.png')
        	let isCrystal = $(element).attr('style').includes('crystal.png')
          let value = parseInt($('span', this).text().replaceAll(".", ""))
          
          if (isMetal) { debris.metal = value }
        	if (isCrystal) { debris.crystal = value }
      })
			
      let cords = galaxy + ":" + system + ":" + position
      let now = new Date()
      let item = typeof dataOfGalaxy[cords] != 'undefined' ? dataOfGalaxy[cords] : {
      	last_attack: undefined,
        isLowFarm: undefined
      }

      item.galaxy = galaxy
      item.system = system
      item.position = position
      item.cords = cords
      item.planet_name = $('.col-planet-name', this).text().replaceAll("\n", "").trim()
      item.alliance = $('.col-alliance', this).text().replaceAll("\n", "").trim()
      item.player_name = $('.col-player > a > span', this).eq(0).text().replaceAll("\n", "").trim()
      item.hasMoon = $('.col-moon > div', this).length == 1,
      item.update_time = now.getTime()
      item.is_protection = $('.col-player .isProtection.tooltip', this).length == 1
      item.is_inactive7 = $('.col-player .isInactive7.tooltip', this).length == 1
      item.is_inactive28 = $('.col-player .isInactive28.tooltip', this).length == 1
      item.is_vacation = $('.col-player .isVacation.tooltip', this).length == 1
      item.debris = debris
      
      let tooltipContentHtml = $('.col-player span[data-tooltip-content]', this).data('tooltip-content')
      let tooltipContentElement = $(tooltipContentHtml)
        
			item.ranking = $('span:contains("Ranking :")', tooltipContentElement).parent().find('a').text().replaceAll('.', '')
      
      planets.push(item)
      
      
      let isHighlights = false
      
      if (settings.galaxy.highlights.debris.metal < debris.metal) { isHighlights = true }
      if (settings.galaxy.highlights.debris.crystal < debris.crystal) { isHighlights = true }
      if (settings.galaxy.highlights.debris.all < debris.metal + debris.crystal) { isHighlights = true }
      
      if (isHighlights) {
      	$(tooltipDiv).parent().css('background-color', settings.colors.highlights)
      }
    })

    savePlanetsData(planets)
  
  
  
	drawAsteroids()
  drawIdlers()
}

async function drawIdlers() {
  let content = ""
  let galaxy = $('#galaxyInput').val()
  let system = $('#systemInput').val()
  
  let serialize = await GM.getValue('galaxy', '{}');
  let data = JSON.parse(serialize)
  
  for(index in data) {
    let item = data[index]
    
    if (typeof item.cords == 'undefined') { continue }
    if (typeof item.is_inactive7 == 'undefined') { continue }
    if (typeof item.is_inactive28 == 'undefined') { continue }
    if (typeof item.debris == 'undefined') { continue }
    let split = item.cords.split(':')
    
    
    if (split[0] != galaxy) {
     	continue 
    }
    
    if (!item.is_inactive7) {
     	continue 
    }
    
    if (item.ranking >= settings.galaxy.farm.minimum_ranking) {
    	continue

    }
    
    
    let now = (new Date()).getTime()
    let highlight = "white"
    
    let lastAttackInSeconds = item.last_attack ? (now - item.last_attack) / 1000 : 0
    
//     if (lastAttackInSeconds == 0) { highlight = "lime" }
//     if (lastAttackInSeconds > 0) { highlight = "orange" }
//     if (lastAttackInSeconds >= 60 * 60) { highlight = "lime" }
    
    let maximumTimeForTimer = 2 * 60 * 60
    
    let hasTimer = lastAttackInSeconds > 0 && lastAttackInSeconds < maximumTimeForTimer
    let isUnmark = (typeof item.isLowFarm == "undefined")
    let isMark = !isUnmark
    let hasDebris = item.debris.metal != 0 || item.debris.crystal != 0
    let allowAutoFarm = false;
    let allowAutoScan = false;
    let showResource = false;
    
    switch(true) {
      case hasDebris: highlight = "pink"; break;
        
      // Nie oznaczony i posiada timer 
      case isUnmark && hasTimer: highlight = 'orange'; break; 
        
      // Nie oznaczony i nie posiada timera
      case isUnmark && !hasTimer: highlight = 'lime'; allowAutoFarm = true; allowAutoScan = true; showResource = true; break; 
        
      // Oznaczony jako słaba farma
      case isMark && item.isLowFarm === true: highlight = 'red'; break;
        
      // Oznaczony jako dobra farma i nie posiada timer'a
      case isMark && item.isLowFarm === false && !hasTimer: highlight = 'gold'; allowAutoFarm = true; allowAutoScan = true; showResource = true; break;
        
      // Oznaczony jako dobra farma i posiada timer'a
      case isMark && item.isLowFarm === false && hasTimer: highlight = 'orange'; break;
    }
    
    let currentSystem = utils_getCurrentCoordinates().split(":")[1]
    
    let distance = Math.abs(item.system - currentSystem)
    let sumOfResource = getSumOfResourceOnPlanetFromEspionage(item.galaxy + `:` + item.system + `:` + item.position)
    
    let attribute = ""
    
    attribute += ` data-distance="` + distance + `"`
    attribute += ` data-coordinate="` + item.galaxy + `:` + item.system + `:` + item.position + `"`
    
    if (allowAutoScan && sumOfResource == -1) {
    	attribute += ` data-allow-auto-scan="1"`
    }
    
    if (sumOfResource != -1) {
     	attribute += ` data-resource="` + sumOfResource + `"` 
    }
    
    attribute += `data-resource="` + sumOfResource + `"`
    
    content += `
    	<li>
            <a href="fleet?x=` + item.galaxy + `&y=` + item.system + `&z=` + item.position + `&planet=1&mission=8" class="attack-item" ` + attribute  + ` data-galaxy="` + item.galaxy + `" data-system="` + item.system + `" data-position="` + item.position + `"  ` + (allowAutoFarm ? 'data-allow-auto-farm="1"' : '') + `>
            	<span style="font-size: 8px; color: ` + highlight + `">
              	` + item.ranking + ` - ` + item.cords + ` ` + (lastAttackInSeconds > 0 && lastAttackInSeconds < maximumTimeForTimer ? '- last attack: ' + secondsToReadable(lastAttackInSeconds) : '') + `
                </span>
            </a>
            
            <a href="#" class="btnActionSpy tooltip" onclick="SendSpy(` + item.galaxy + `,` + item.system + `, ` + item.position + ` ,1,false); return false;" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Spy</div>" style="font-size: 7px; color: white;">Szpieguj</a>
            <a href="https://hyper.ogamex.net/galaxy?x=` + item.galaxy + `&y=` + item.system + `" style="font-size: 7px; color: white;">Galaktyka</a>
            <span>` + (sumOfResource > 0 && showResource ? 'Resource: ' + sumOfResource.toLocaleString() : '') + `</span>     
            </li>
    `
  }
  
  $('#yourfrog-idlers').remove()
  $('#galaxy-container').append(`
  	<div id="yourfrog-idlers" style="padding: 20px;">
    	<h5>Idlers</h5>
      
      <center>
      	<a href="#auto-farm" data-auto-farm="1" style="color: white;" id="auto-farm">Auto Farm by distance</a>
      	<a href="#auto-farm" data-auto-farm="2" style="color: white;" id="auto-farm">Auto Farm by resource</a>
      	<a href="#auto-scan" data-auto-scan="1" style="color: white;" id="auto-scan">Auto Scan</a>
      </center>
      
      <ul style="float: right">
      	<li>Legenda kolorów</li>
	      <li><span style="font-size: 7px; color:lime">Dawno nie atakowany</span></li>
  	    <li><span style="font-size: 7px; color:orange">Zaatakowany niedawno</span></li>
    	  <li><span style="font-size: 7px; color:pink">Posiada debris</span></li>
    	  <li><span style="font-size: 7px; color:red">Słaba farma</span></li>
    	  <li><span style="font-size: 7px; color:gold">Dobra farma</span></li>
      </ul>
    	<ul>
      	` + content + `
      </ul>
    </div>
  `)
  
  console.log('complete idlers')
}

function drawAsteroids() {
  let content = ""
  
  for(cords in asteroids) {
    let now = (new Date()).getTime()
    let item = asteroids[cords]

    if (typeof item == 'undefined') { continue }
    if (typeof item.left == 'undefined') { continue }

    let ageInSeconds = parseInt((now - item.updateAt) / 1000)
    let leftInSeconds = item.left - ageInSeconds

    if (leftInSeconds < 0) { continue }
    
    let highlight = "lime"
    if (item.is_send > 0) { highlight = "orange" }
    
    
    let sendAtInSeconds = item.sendAt ? (now - item.sendAt) / 1000 : 0
    
    let attributes = ""
    
    attributes += ` data-galaxy="` + item.galaxy + `"`
    attributes += ` data-system="` + item.system + `"`
    attributes += ` data-left="` + leftInSeconds + `"`
    
    if (!item.is_send) {
    	attributes += ` data-auto="1"`  
    }
    
    content += `
          <li>            
            <a href="fleet?x=` + item.galaxy + `&y=` + item.system + `&z=17&planet=1&mission=12" class="asteroid-item" ` + attributes + ` >
            	<span style="font-size: 8px; color: ` + highlight + `">` + cords + ` [` + secondsToReadable(leftInSeconds) + `] ` + (sendAtInSeconds > 0 ? '- wysłano: ' + secondsToReadable(sendAtInSeconds) + " temu" : '') + `</span>
              	
              <a href="https://hyper.ogamex.net/galaxy?x=` + item.galaxy + `&y=` + item.system + `" style="font-size: 7px; color: white;">Galaktyka</a>
            </a>
          </li>
		`
  }
  
  
  $('#yourfrog-asteroids').remove()
  $('#galaxy-container').append(`
  	<div id="yourfrog-asteroids" style="padding: 20px;">
    	<h5>Asteroidy</h5>
    	<ul>
      	` + content + `
      </ul>
    </div>
  `)
  
}


function secondsToReadable(value) {
  let hours = Math.floor(value / 3600);
	let totalSeconds = value % 3600;
	let minutes = Math.floor(totalSeconds / 60);
	let seconds = parseInt(totalSeconds % 60);
  
  return hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0') + ":" + seconds.toString().padStart(2, '0')
}














/////////////////////////////////////////////////////////////////////////////////////
//
//	Nowa wersja scanera asteroid
//
/////////////////////////////////////////////////////////////////////////////////////

const EasyBrowser = {
	urlParameterExists: function(name) {
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);
    
    return urlParams.has(name)
  }
}

const EasySelenium = {
	/**
	 *	Oczekuje do momentu gdy element o podanym selektorze się pojawi w drzewie
	 */
	waitForElement: function(selector) {
		return new Promise(resolve => {
			let elements = $(selector)
			
			if (elements.length >= 1) {
				return resolve(elements)
			}
			
			const observer = new MutationObserver(mutations => {
				let elements = $(selector)	
				
				if (elements.length >= 1) {
					observer.disconnect();
					return resolve(elements)
				}
			})
			
			observer.observe(document.body, {
				childList: true,
				subtree: true
			})
		})
	},

	/**
	 *	Oczekuje do momentu gdy element o podanym selektorze zniknie z drzewa
	 */
	waitForElementNotExists: function(selector) {
		return new Promise(resolve => {
			let elements = $(selector)
			
			if (elements.length == 0) {
				return resolve(elements)
			}
			
			const observer = new MutationObserver(mutations => {
				let elements = $(selector)	
				
				if (elements.length == 0) {
					observer.disconnect();
					return resolve(elements)
				}
			})
			
			observer.observe(document.body, {
				childList: true,
				subtree: true
			})
		})
	},
  
  /**
   *	Sprawdzenie czy element istnieje w DOM
   */
  isExists: function(selector) {
    let elements = $(selector)
    
    if (elements.length == 0) {
      return false;
    }
    
  	return true  
  },
  
  /**
   *	Klika w element jeżeli istnieje. Zwraca True w przypadku kliknięcia i False w przeciwnym
   */
  click: function(selector) {
    let element = $(selector)
    
    if (element.length == 0) {
     	return false 
    }
    
    $(element)[0].click()
    return true
  }
}

const EasyOGameX = {
  Fleet: {
    /**
     *	Zliczenie ilości flot wracających asteroidek
     */
    countOfMining: async function() {
      let isOpen = $('#layoutFleetMovements.fleet-movement-wrapper.opened').length == 1
          
      if (!isOpen) {
      	// Próba otwarcia zakładki z flotą
        if (!EasySelenium.click('#fleet-movement-detail-btn')) { return 0 }
        
        // Oczekujemy na załadowanie flot
        await EasySelenium.waitForElement('#layoutFleetMovements.fleet-movement-wrapper.opened');
      }
      
      let count = $('#layoutFleetMovements .row-mission-type-ASTEROID_MINING.row-fleet-return').length
      
      return count
    }
  },
	Galaxy: {
		/**
		 *	Sprawdzenie czy w układzie znajduje się asteroida
		 */
		systemHasAsteroid: function() {
		  return $('.galaxy-item .btn-asteroid').length == 1
		},
		
    /**
     *	Sprawdzenie czy asteroidy na liście nadal występują
     */
    checkAsteroids: async function() {
	      let data = []
          
        $('.asteroid-item').each(function(index, element) {
          data.push({
           	galaxy: parseInt($(element).data('galaxy')),
            system: parseInt($(element).data('system'))
          })
        })
        
        for (let index in data) {
          // Ustawienie współrzędnych
          $('#systemInput').val(data[index].system)

          // Pobranie danych
          $('.x-btn-go')[0].click();

          // Oczekiwanie na załadowanie strony
          await EasySelenium.waitForElementNotExists('#BackGroundFreezerPreloader_Element');

          // Zapewnienei kompatybilności dla starej wersji
          utils_UpdateGalaxySystem()
        }
    },
    
		/**
		 *	Zwraca minimalną ilość układów w których może znajdować się asteroida
		 */
		parseAsteroidLineCoordinates: function() {
			let ranges = []
			
			$('#playerAsteroidTable tr').each((index, parent) => {
				
				let min = $('td', parent).eq(0).text().trim()
				let max = $('td', parent).eq(2).text().trim()
				
				let minCoordinate = EasyOGameX.Utils.stringToCoordinate(min)
				let maxCoordinate = EasyOGameX.Utils.stringToCoordinate(max)
				
				ranges.push({
					min: minCoordinate.system,
					max: maxCoordinate.system
				})
			})
			
			return {
				galaxy: 1, //ranges[0].min.galaxy,
				ranges: ranges,
			}
		},

		/**
		 *	Zwraca systemy w których znajdują się asteroidy. UWAGA !! Funkcja przechodzi po elementach na stronie więc jej uruchomienie chwile trwa
		 */
		getSystemsWithAsteroids: async function() {
			let visitedSystems = []
			let data = EasyOGameX.Galaxy.parseAsteroidLineCoordinates()
			
			let result = []
			
			for(let rangeIndex in data.ranges) {
				let range = data.ranges[rangeIndex]
				
				for(let system = range.min; system <= range.max; system++) {
					// Jedynie układy z potencjalną asteroidą
					if (visitedSystems.includes(system)) { 
						continue 
					}

					// Dodajemy system jako "odwiedzony" do celów statycznych
					visitedSystems.push(system)
					
					// Ustawienie współrzędnych
					$('#systemInput').val(system)

					// Pobranie danych
          $('.x-btn-go')[0].click()
				
					// Oczekiwanie na załadowanie strony
					await EasySelenium.waitForElementNotExists('#BackGroundFreezerPreloader_Element')
					
          // Zapewnienei kompatybilności dla starej wersji
          utils_UpdateGalaxySystem()
          
					// Sprawdzenie czy w układzie znajduje się asteroida
					let hasAsteroid = EasyOGameX.Galaxy.systemHasAsteroid()
					
					if (hasAsteroid) {
						result.push({
							galaxy: data.galaxy,
							system: system,
							position: 17
						})
						
						// Skaczemy do następnego zakresu
						break
					}
				}
			}
			
			return result
		}	
	},
	Utils: {
		/** 
		 *	Zamienia ciąg w postaci "[{galaxy}:{system}:{position}]"
		 */
		stringToCoordinate: function(str) {
			let split = str.replaceAll("[", "").replaceAll("]", "").split(":")
			
			return new Coordinate(
				parseInt(split[0]),
				parseInt(split[1]),
				parseInt(split[2]),
        ObjectType.UNKNOWN
			)
		},
    
    /**
     *	Sprawdzenie czy mamy doczynienia z tymi samymi współrzędnymi
     */
    isEqualsCoordinate: function(a, b) {
      console.log('d', a, b)
      
      console.log('a', a.galaxy != b.galaxy)
      if (a.galaxy != b.galaxy) { return false }
      
      console.log('a', a.system != b.system)
      if (a.system != b.system) { return false }
      
      console.log('a', a.position != b.position)
      if (a.position != b.position) { return false }
      
      
      console.log('a')
      return true
    },
	},
  /**
   *	Funkcje wspierające ustawianie i pobieranie globalnego stanu skryptu w celu umożliwienia przejścia pomiędzy ekranami
   */
  State: {
    reset: async function() {
      await GM.setValue('script_state', STATE_NOTHING);
    },

		set: async function(value, extra) {
      await GM.setValue('script_state', value);
      await GM.setValue('script_state_extra', extra);
    },

		current: async function() {
      return await GM.getValue('script_state', STATE_NOTHING);
    },
    
		extra: async function() {
      return await GM.getValue('script_state_extra', undefined);
    },
    
    is: async function(value) {
      let current = await EasyOGameX.State.current()
      
      return current == value
    }
  },
  Data: {
    /**
     *	Pobranie informacji na jakim obiekcie sie znajdujemy
     */
    currentObject: function() {
      let type = ObjectType.PLANET
      
      if (EasySelenium.isExists('.moon-select.selected')) {
      	type = ObjectType.MOON  
      }
      
      let stringCoordinate
      
      switch(type) {
        case ObjectType.PLANET:
          	stringCoordinate = $('a.planet-select.selected span.planet-coords').clone().children().remove().end().text().trim()
            break;
          
        case ObjectType.MOON:
          	stringCoordinate = $('.moon-select.selected').parent().find('span.planet-coords').clone().children().remove().end().text().trim()
          break;
      }
      
      let coordinate = EasyOGameX.Utils.stringToCoordinate(stringCoordinate)

      return new Coordinate(
        coordinate.galaxy, 
        coordinate.system, 
        coordinate.position, 
        type
      )
		},
    Bot: {
      Farming: {
        isAutoMiners: async function() {
        	return await GM.getValue('data.bot.farming.auto_miners', false)  
        },
        
        toggleAutoMiners: async function() {
          let value = await EasyOGameX.Data.Bot.Farming.isAutoMiners()
          
          await GM.setValue('data.bot.farming.auto_miners', !value);
        }
      }
    },
    Account: {
     	Asteroids: {
        isExceeded: async function() {
          let data = await GM.getValue('data.account.asteroids.today', {
          	value: -1,
            updateAt: 0
          });
            
            
          let now = (new Date()).getTime()
          
         	return now > data.updateAt + 5 * 60 * 1000 // Ważność asteroid to 5 minut
        },
              
       	countToday: async function() {
          let data = await GM.getValue('data.account.asteroids.today', {
          	value: -1,
            updateAt: 0
          });
          
          return parseInt(data.value)
        },
        
        setToday: async function(value) {
          let data = {
          	value: value,
            updateAt: (new Date()).getTime()
          }
          
      		await GM.setValue('data.account.asteroids.today', data);
        }
      }
    }
  },
  /**
   *	Funkcje ułatwiające nawigowanie pomiędzy ekranami
   */
  Navigator: {
    /**
     *	Przejście na stronę z automatycznym ustawieniem stanu skryptu
     */
		goToPage: async function(pathname, scriptState, extra) {
      if (typeof scriptState == "undefined") {
        scriptState = STATE_NOTHING
      }
      
      if (typeof extra == "undefined") {
        extra = {}
      }

      EasyOGameX.State.set(scriptState, extra)
      window.location = pathname
    },
    /**
     *	Kliknięcie obiektu na liście planet
     */
    goToObject: function(coordinate, type) {
      let element
      
      switch(type) {
        case ObjectType.PLANET:
            element = $('span.planet-coords:contains("' + coordinate + '")')
          break;

        case ObjectType.MOON:
            element = $('span.planet-coords:contains("' + coordinate + '")').parent().parent().find('.moon-select')
          break;
      }

      console.log(element, coordinate, type)
      element[0].click()
    }
  },
	Script: {
    Profile: {
      updateStatistics: async function() {
        $('.navigation .nav-item:contains("Asteroid Journal")')[0].click() 

        await EasySelenium.waitForElement('#asteroidLogTable:visible, #profile-tab-astreoidLog .no-entries-journal'); 
        let successfulMissions = $('#asteroidLogTable tbody tr td:nth-child(2):not(:contains("Empty"))').length 

        EasyOGameX.Data.Account.Asteroids.setToday(successfulMissions)
      }
    },
		Galaxy: {
			/**
			 *	Uruchomienie zbierania asteroidek
			 */
			runAsteroidFarming: async function(recursive = false) {
        let currentCoordinate = EasyOGameX.Data.currentObject()
        let settingsCoordinate;
        
        settingsCoordinate = EasyOGameX.Utils.stringToCoordinate(settings.galaxy.asteroid.source.coordinates)
        settingsCoordinate.type = settings.galaxy.asteroid.source.type
          
        if (!currentCoordinate.isEquals(settingsCoordinate)) {
//        if (!EasyOGameX.Utils.isEqualsCoordinate(currentObject.coordinate, settingsCoordinate)) {
          // Zabezpieczenie przed uruchomieniem na złej planecie
          EasyOGameX.Navigator.goToObject(settings.galaxy.asteroid.source.coordinates, settings.galaxy.asteroid.source.type)
          return
        }
             
				// Sprawdzamy ile flot aktualnie jest w ruchu
				let fleet = await EasyOGameX.Fleet.countOfMining()
        
        if (fleet >= settings.galaxy.asteroid.maximumFleets) {
         	alert('Osiągnięto maksymalną ilość minerów w powietrzu')
        	return
        }
        
        let elements = $('.asteroid-item[data-auto]').toArray().sort((a, b) => {
          	let aLeft = $(a).attr('data-left')
            let bLeft = $(b).attr('data-left')
            
            if (aLeft == bLeft) { return 0; }
          
          	return (aLeft > bLeft ? 1 : -1)
        })
        
        if (elements.length == 0) {
          if (recursive) {
          	alert('Brak asteroid na które można wysłać statki (sprawdzona galaktyka)')
            return
          }
          
          await EasyOGameX.Script.Galaxy.runAsteroidScanner()
          await EasyOGameX.Script.Galaxy.runAsteroidFarming(true)
          
          return
        }
        
        let isStatisticsExceeded = await EasyOGameX.Data.Account.Asteroids.isExceeded()
        
        if (isStatisticsExceeded) {
          EasyOGameX.Navigator.goToPage('/home/playerprofile', STATE_UPDATE_STATISTICS_ASTEROID, {
            galaxy: $(elements).eq(0).attr('data-galaxy'),
            system: $(elements).eq(0).attr('data-system')
          })
        } else {
          EasyOGameX.Navigator.goToPage('/fleet', STATE_SEND_MINNERS, {
            galaxy: $(elements).eq(0).attr('data-galaxy'),
            system: $(elements).eq(0).attr('data-system')
          })
        }
			},
			
			/**
			 *	Uruchomienie samego scannera asteroidek
			 */
			runAsteroidScanner: async function() {
        $('span.btn-asteroid-find.x-find-asteroid')[0].click();

        await EasySelenium.waitForElement('#playerAsteroidTable');
        await EasyOGameX.Galaxy.getSystemsWithAsteroids()
        await EasyOGameX.Galaxy.checkAsteroids()
			}
		}
	}
}


  
function Coordinate(galaxy, system, position, type = ObjectType.UNKNOWN)
{
  this.__name = "Coordinate"
  
	this.galaxy = galaxy
  this.system = system
  this.position = position
  this.type = type
    
  /**
   *	Sprawdzenie czy mamy doczynienia z tymi samymi współrzędnymi
   */
  this.isEquals = function(other) {
    
    console.log('abc', this, other)
    	if (this.__name != other.__name) { 
        console.err('Porównujemy różne obiekty !!')
        return false 
      }
    
      if (this.galaxy != other.galaxy) { return false }
      if (this.system != other.system) { return false }
      if (this.position != other.position) { return false }
    
    	if (this.type != other.type) { return false }
      
      return true
  }
}


