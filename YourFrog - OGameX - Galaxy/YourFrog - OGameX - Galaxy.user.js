// ==UserScript==
// @name     YourFrog - OGameX - Galaxy
// @version  1
// @include  *https://hyper.ogamex.net/galaxy*
// @include  *https://hyper.ogamex.net/messages*
// @include  *https://hyper.ogamex.net/fleet*
// @include  *https://hyper.ogamex.net/home/playerprofile*
// @include  *https://hyper.ogamex.net/statistics*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @require https://github.com/YourFrog/OGameX/raw/main/YourFrog%20-%20OGameX%20-%20Communicate/YourFrog%20-%20OGameX%20-%20Communicate.user.js
// @require https://cdn.datatables.net/2.1.4/js/dataTables.min.js
// @resource https://cdn.datatables.net/2.1.4/css/dataTables.dataTables.min.css
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
let dataOfRanking = {}
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
    slots: 58
  },
  galaxy: {
    // Czy pokazywać pozycje gracza obok jego nicku
    isShowPlayerRanking: true,
    
    highlights: {
      	debris: {
          // Przy jakiej ilości metalu + kryształu podświetli sie pole (bez przelicznika 3:2:1)
          all: 200_000_000_000,
          
          // Przy jakiej ilości metalu podświetli sie pole
         	metal: 100_000_000_000,
          
          // Przy jakiej ilości kryształu podświetli sie pole
          crystal: 100_000_000_000
        }
    },
    farm: {
      // Minimalny ranking gracza aby uwzględniać go na liście farm
     	minimum_ranking: 1400,
      
      // Ważność raportu szpiegowskiego w sekundach (default 45 min)
      validity_of_espionage_report_in_seconds: 45 * 60 * 1_000,
      
      // Minimalny czas pomiędzy atakami na idlaka
    	minimumDelayBetweenAttacks: 1 * 60 * 60, //15 * 60,
      
      // Ile statków per slot
      ships: 3_000_000,
      
      // Pojemność jednej sztuki statku
      capacity: 71_250,

      // Minimalna ilość surowców na farmie którą atakujemy
      minimum_resource: 50_000_000_000,
      
      // Planety które bierzemy pod uwagę przy farmieniu
      availablePlanets: [
        {coordinates: "1:56:9", type: ObjectType.PLANET},	  // S
        {coordinates: "1:145:4", type: ObjectType.PLANET},
        {coordinates: "1:287:9", type: ObjectType.PLANET},  // M
        {coordinates: "1:374:7", type: ObjectType.PLANET},  // R
        
        {coordinates: "2:241:7", type: ObjectType.PLANET},
        
        {coordinates: "3:246:7", type: ObjectType.PLANET},
        
        {coordinates: "4:119:7", type: ObjectType.PLANET},
      ]
    },
    /************************************************/
    /*                                              */
    /*						=== Asteroidy ===								 	*/
    /*																							*/
    /************************************************/
    asteroid: {
      // Maksymalna ilość statków jaka może zostać wysłana
      ships: 190_000_000,
      
      // Maksymalna ilość misji w powietrzu
      maximumFleets: 8,
      
      // Informacje o obiekcie z którego będą wysyłane statki
      source: { 
        // Współrzędne planety, Format: {system}:{układ}:{pozycja}
        coordinates: "1:287:9", 

        // Enum: ObjectType
        type: ObjectType.PLANET
      }
    },
    
    
    expedition: {
      // Ile ekspedycji będzie utrzymywał w powietrzu
      maximumExpeditionCount: 5,
      
      // Na ile minut są wysyłane ekspedycje. 60 - 1h, 480 - 8h itp.
      duration: 60,
      
      // Czas jaki oczekujemy przed wysłaniem kolejnej fali
      delayBetweenMissions: {
       	minimum: 10_000,
        
        maximum: 15_000
      },
      
      /**
       *	Statki które zostaną uwzględnione przy wysyłce
       */
     	allowShips: [
      	//"HEAVY_CARGO",
        //"LIGHT_CARGO",
        // "ASTEROID_MINER",
        // "SPY_PROBE",
        "LIGHT_FIGHTER",
        "HEAVY_FIGHTER",
        "RECYCLER",
        "CRUISER",
        "BATTLESHIP",
        "BATTLE_CRUISER",
        "DESTROYER",
        "PLANET_BOMBER",
        "REAPER",
      ]
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
const STATE_AUTO_EXPEDITION_STEP_1 = 4
const STATE_AUTO_EXPEDITION_COLLECT_DATA = 5 // Zebranie danych odnośnie ilości wysłanych ekspedycji
const STATE_AUTO_FARM = 6

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
  
  let suffixExpedition = "off"
  
  if (await EasyOGameX.Data.Bot.Expedition.isOn()) {
   	suffixExpedition = "on" 
  }
  
  $('#left-menu-1').prepend(`
    <div class="menu-item" style="margin-bottom: 30px;">
      <a href="#" class="text-item" style="color:#4caf50;" id="yourfrog-auto-expedition">Expedition: ` + suffixExpedition + `</a>
    </div>
  `)
  
  $('#left-menu-1').append(`
    <div class="menu-item">
      <a href="#" class="text-item" style="color:#4caf50;" id="yourfrog-export">Export Galaxy</a>
    </div>
  `)
  
  $('.galaxy-route').append(`
		<div style="float:right;padding:2px;border:1px solid rgb(43,63,90);border-left:2px solid rgb(43,63,90);">
			<a href="#" class="btn-route" style="padding:0px 10px;border-radius:0px;color: #0A0;font-weight: bold;" id="yourfrog-clean">Clean</a>
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
      $('#fleet-messages-tab .message-area').prepend(`
        <div style="float:right;padding:2px;border:1px solid rgb(43,63,90);border-left:2px solid rgb(43,63,90);">
          <a href="#" class="btn-route" style="padding:0px 10px;border-radius:0px;color: #0A0;font-weight: bold;" id="yourfrog-review-espionage">Review espionage</a>
        </div>
        <div style="float:right;padding:2px;border:1px solid rgb(43,63,90);border-left:2px solid rgb(43,63,90);">
          <a href="#" class="btn-route" style="padding:0px 10px;border-radius:0px;color: #0A0;font-weight: bold;" id="yourfrog-review-espionage-fast">Fast review espionage</a>
        </div>
        <div style="float:right;padding:2px;border:1px solid rgb(43,63,90);border-left:2px solid rgb(43,63,90);">
          <a href="#" class="btn-route" style="padding:0px 10px;border-radius:0px;color: #0A0;font-weight: bold;" id="yourfrog-highlight-espionage">Highlight espionage</a>
        </div>
      `)

      if ($('.message-area .pagination-area:eq(0) .page-index-text.x-remove-msg-category').length != 1) {
        $('.message-area .pagination-area:eq(0)').prepend($('.page-index-text.x-remove-msg-category').parent().clone(true, true))
      }
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
  
  $(document).on('click', '#yourfrog-auto-expedition', (event) => {
  	  
    (async() => {
      await EasyOGameX.Data.Bot.Expedition.toggle()    
      EasyOGameX.Navigator.goToPage('/fleet', STATE_NOTHING)
    })()
  })
  
  // highlight dużych flot
  $(document).on('click', '#yourfrog-highlight-espionage', function() {
    console.log('aa')
    
    $('.message-content').each(function() {
      let split = $('span:contains("Fleet")', this).text().split(":")

      if (split.length < 2) { return true }

      let ships = parseInt(split[1].trim().replaceAll(".", ""))

      if (ships < 15_800_000_000) {
        return true
      }
      
      $(this).css('background-color', 'green')
      
      let playerName = $('table tbody td:eq(0) span.msg-player-status', this).text().trim()
      let planets = findPlanetsByNickname(playerName)
			let ranking = findRankingByPlayerName(playerName)
      
      let content = ``
      let researchContent = ``
      let officersContent = ``
      let academyContent = ``
      let rankingContent = ``
      
      let countPossiblePlanets = parseInt((parseInt(ranking.research.astrophysics) + 1) / 2) + parseInt(ranking.officers.emperor) + parseInt(ranking.academy.expanding_of_the_empire) + 1
      let countCurrentPlanets = Object.keys(planets).length
          
      for (let j in ranking.research) {
        researchContent += '<tr><td>' + j + '</td><td>' + ranking.research[j] + '</td></tr>'
      }
      
      for (let j in ranking.officers) {
        officersContent += '<tr><td>' + j + '</td><td>' + ranking.officers[j] + '</td></tr>'
      }
      
      for (let j in ranking.academy) {
        academyContent += '<tr><td>' + j + '</td><td>' + ranking.academy[j] + '</td></tr>'
      }
      
      for (let coordinate in planets) {
        let getActivityContent = function(data) {
          if (data) {
            let now = (new Date()).getTime()
            let age = parseInt((now - data.updateAt) / 1000) + ' seconds'
            
            switch(true) {
              case data.value == null: return 'No activity, age: ' + age; break;
              case data.value == '*': return '< 15m, age: ' + age; break;
              default:
                return data.value + ', age: ' + age
            }
          }
          
          return '== ? =='
        }
        
        let planet = planets[coordinate]
    
        let moonContent = ''
            
        if (planet.hasMoon) {
          moonContent = getActivityContent(planet.moon_activity)
        } else {
         	moonContent = 'No moon' 
        }
            
      	content += `
        	<tr>
        		<td><a href="/galaxy?x=` + planet.galaxy + `&y=` + planet.system + `">` + coordinate + `</a></td>
            <td>` + getActivityContent(planet.planet_activity) + `</td>
            <td>` + moonContent + `</td>
          </tr>
        `  
      }
      
      rankingContent += '<tr><td>Ogólny</td><td>' + ranking.ranking + '</td></tr>'
      rankingContent += '<tr><td>Flota</td><td>' + ranking.fleet + '</td></tr>'
      rankingContent += '<tr><td>Obrona</td><td>' + ranking.defense + '</td></tr>'
      
      $(this).append(`
      ` + (countCurrentPlanets < countPossiblePlanets ? '<div style="margin: 20px 0;width: 100%; text-align: center; color: red;">W zestawieniu brakuje ' + (countPossiblePlanets - countCurrentPlanets) + ' planet</div>' : '') + `
      
      
      	<table style="width: 100%;">
        	<thead>
          	<tr>
            	<td>Współrzędne</td>
              <td>Aktywność - Planeta</td>
              <td>Aktywność - Księżyc</td>
            </tr>
          </thead>
        	<tbody>` + content + `</tbody>
        </table>
        
        <div style="margin-top: 10px;">
          <center><span>Badania</span></center>
          <table style="width: 100%;">
            <tbody>` + researchContent + `</tbody>
          </table>
        </div>
        
        <div style="margin-top: 5px;">
          <center><span>Oficerowie</span></center>
          <table style="width: 100%;">
            <tbody>` + officersContent + `</tbody>
          </table>
        </div>
        
        <div style="margin-top: 5px;">
          <center><span>Akademia</span></center>
          <table style="width: 100%;">
            <tbody>` + academyContent + `</tbody>
          </table>
        </div>
        
        <div style="margin-top: 5px;">
          <center><span>Ranking</span></center>
          <table style="width: 100%;">
            <tbody>` + rankingContent + `</tbody>
          </table>
        </div>
      `)
      
    })
  })
  
  // Przyśpieszona procedura zbierania informacji o farmach z wiadomości
  $(document).on('click', '#yourfrog-review-espionage-fast', function() {
    let elements = $('a.btn-report-more-info');
    let size = elements.length

    // Zebranie EspionageID w celu przyśpieszonych ataków na farmy
    elements.each((index, element) => {
      let mainElement = $(element).closest('[data-msg-template="FLEET_ESPIONAGE_REPORT"]')

      let coordinates = EasyOGameX.Utils.Espionage.extractEspionageCoordinates(mainElement)
      let farm = dataOfGalaxy[coordinates.toSimpleString()]

      farm.lastEspionageId = EasyOGameX.Utils.Espionage.extractEspionageId(mainElement)
      
      let hasFleet = $(':contains("Fleet: 0")', mainElement).length == 0
      let hasDefense = $(':contains("Defense: 0")', mainElement).length == 0
      
      if (hasFleet || hasDefense) {
       	return true 
      }
      
      let resource = {
      	metal: parseInt($('img[src="/assets/images/resource/metal.png"]', mainElement).parent().text().split(':')[1].trim().replaceAll('.', '')),
      	crystal: parseInt($('img[src="/assets/images/resource/crystal.png"]', mainElement).parent().text().split(':')[1].trim().replaceAll('.', '')),
      	deuter: parseInt($('img[src="/assets/images/resource/deuterium.png"]', mainElement).parent().text().split(':')[1].trim().replaceAll('.', ''))
    	}

      farm.espionage = {
        type: 'short',
        updateAt: (new Date()).getTime(),
        building: {},
        resource: resource
      }
    });

    // Zapisanie zmian oraz rozpoczęcie przeglądania raportów 
    (async() => {
      let serializeObj = JSON.stringify(dataOfGalaxy);
      await GM.setValue('galaxy', serializeObj);
      
      alert('Skończyłem')
    })()
  })
  
  // Przejrzenie wszystkich raportów szpiegowskich
  $(document).on('click', '#yourfrog-review-espionage', function() {
    let elements = $('a.btn-report-more-info');

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
  
  $(document).on('click', '#yourfrog-clean', function() {
	    (async() => {
        await GM.setValue('galaxy', '{}')
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
        
      if (isNaN(actualMovements)) {
    		return availableSlots - 1    
      }
    
    	let count = availableSlots - actualMovements - 1 
      
    	return count
  }
  
  

function collectPointsStatisticsPage() {
	let result = []
	
	let type = $('#statistics-container .navigation .nav-item.x-sub-category.active').data('sub-category')
	console.log(type)
	$('div.statistics-table-container > table tbody tr').each(function() {
		let item = {
			type: type,
			ranking: {
				position: parseInt($('td', this).eq(0).text()),
				change: parseInt($('td', this).eq(1).text()),
			},
			player: {
				id: $('a:not(.alliance-tag)', this).attr('onclick').split("'")[1].split("'")[0],
				name: $('a:not(.alliance-tag)', this).text(),
			},
			alliance: {
				name: $('a.alliance-tag', this).text()
			},
			status: {
				vacation: $('.player-status.isVacation', this).length == 1,
				protection: $('.player-status.isProtection', this).length == 1,
				inactive7: $('.player-status.isInactive7', this).length == 1,
				inactive28: $('.player-status.isInactive28', this).length == 1, 
			},
			points: {
				current: parseInt($('td:eq(6) div:eq(0)', this).text().trim().replaceAll('.', '')),
				change: $('.x-points-change', this).text().trim()
			}
		}

		result.push(item)
	})
	
	return result
}

function toFlatData(data)
{
	let players = {}
	
	for (type in data) {
		let items = data[type]
		
		for (itemIndex in items) {
			let item = items[itemIndex]
			
			if (typeof players[item.player.id] == 'undefined') {
				players[item.player.id] = {}
			}
			
			players[item.player.id][type] = item
		}
	}
	
	let result = []
	
	for (playerIndex in players) {
		let player = players[playerIndex]
		
		if (
			(typeof player.POINTS != 'undefined')
			&& (typeof player.BUILDING != 'undefined')
			&& (typeof player.RESEARCH != 'undefined')
			&& (typeof player.FLEET != 'undefined')
			&& (typeof player.DEFENSE != 'undefined')
		) {
			let resource = player.POINTS.points.current - player.BUILDING.points.current - player.RESEARCH.points.current - player.FLEET.points.current - player.DEFENSE.points.current
	
			player.defense = player.DEFENSE.ranking.position
			player.fleet = player.FLEET.ranking.position
			player.ranking = player.POINTS.ranking.position
			player.player_name = player.POINTS.player.name
			player.resource = resource * 1_000
			player.is_vacation = player.POINTS.status.vacation
			player.is_protection = player.POINTS.status.protection
			player.is_inactive7 = player.POINTS.status.inactive7
			player.is_inactive28 = player.POINTS.status.inactive28
			
			result.push(player)
		}
	}
	
	
	return result.sort((a, b) => {
		if (a.resource == b.resource) { return 0 }
		
		return (a.resource > b.resource ? -1 : 1)
	})
}
  
  // Pobranei danych ze statystyk
  $(document).on('click', '#yourfrog-collect-statistic-data', function(event) {

    (async() => {
      let types = ["POINTS", "BUILDING", "RESEARCH", "FLEET", "DEFENSE"]
      let maximumPage = 5

      let data = {}

      for (index in types) {
        let currentType = types[index]

        console.log('Change type to: ' + currentType)

        $('[data-sub-category="' + currentType + '"]')[0].click()
        await EasySelenium.waitForElementNotExists('.statistics-section > div[style*="loading.gif"]')

        $('[data-page-target="1"]')[0].click()
        await EasySelenium.waitForElementNotExists('.statistics-section > div[style*="loading.gif"]')

        for (let i = 0; i < maximumPage; i++) {
          let dataOnPage = collectPointsStatisticsPage()

          if (typeof data[currentType] == 'undefined') {
            data[currentType] = []
          }

          for (let dataIndex in dataOnPage) {
            data[currentType].push(dataOnPage[dataIndex])
          }

          let currentSquare = $('#statistics-container .pagination:eq(0) a.active')
          let pageNumber = $(currentSquare).text()

          $(currentSquare).next()[0].click()
          await EasySelenium.waitForElementNotExists('.statistics-section > div[style*="loading.gif"]')

          await sleep(500)
        }
      }
      
      dataOfRanking = toFlatData(data)


      let serializeObj = JSON.stringify(dataOfRanking);
      await GM.setValue('ranking', serializeObj);

//       let obj = 'Nick,Ranking,Urlop,Ochrona,Flota,Obrona,Surowce' + '\n';
//       for (index in flat) {
//         let item = flat[index]

//         obj += item.player_name 
//         obj += ',' + item.ranking 
//         obj += ',' + item.is_vacation 
//         obj += ',' + item.is_protection 
//         obj += ',' + item.is_inactive7 
//         obj += ',' + item.is_inactive28 
//         obj += ',' + item.fleet 
//         obj += ',' + item.defense 
//         obj += ',' + item.resource.toLocaleString() 
//         obj += '\n'

        //console.log('player: ' + item.player_name + ' (' +  item.ranking + '), resource: ' + item.resource.toLocaleString())
//       }

        // let planets = findPlanetsByNickname("Commander Spica")
        // console.log('ABC', planets)

      console.log(obj)
    })()
  })
  
  // Automatyczne wysyłanie skanów do farm które nie skanowano od 1h
  $(document).on('click', '[data-auto-scan="1"]', function(event) {
    event.preventDefault();

    (async() => {
   		sendEspionages()
    })()
  })
  
  $(document).on('click', '[data-auto-scan="2"]', function(event) {
    event.preventDefault();

    (async() => {
//    sendEspionages()
      
//       let planets = findPlanetsByNickname("Umpalumpa")
//       console.log(planets)
//       return
      
      sendEspionagesToGalaxy(6, 1, 500, 50, 30, 300)
//       sendEspionagesToGalaxy(1, 251, 300)
//       sendEspionagesToGalaxy(1, 301, 350)
//       sendEspionagesToGalaxy(1, 351, 400)
//       sendEspionagesToGalaxy(1, 301, 400)
//    	sendEspionagesToGalaxy("Daky")
    })()
  })
  
  function findRankingByPlayerName(value) {
    for (let index in dataOfRanking) {
      let item = dataOfRanking[index]
    
      if (item.player_name == value) {
        return item
      }
    }
    
    return undefined
  };
  
  async function sendEspionagesToGalaxy(galaxy, minSystem, maxSystem, minRanking, minFleet, maxFleet) {
  	let planets = findPlanetsByGalaxy(galaxy)
    
    let filteredPlanets = []
    
    for (let index in planets) {
     	let planet = planets[index]
    	let ranking = findRankingByPlayerName(planet.player_name)
      
      if (planet.is_inactive28) { continue; }
      if (planet.is_inactive7) { continue; }
      
      if (planet.is_protection) { continue; }
      if (planet.is_vacation) { continue; }
      if (planet.is_noob) { continue; }
      
      if (!ranking) { continue; }
      if (ranking.fleet < minFleet || ranking.fleet >= maxFleet) { continue; }
      if (planet.system < minSystem || planet.system > maxSystem) { continue; }
      if (planet.ranking < minRanking) { continue; }
      if (planet.alliance == 'SGF') { continue; }
      
      filteredPlanets.push(planet)
    }
    
    let cc = filteredPlanets.length
		let count = 0
    
    for (index in filteredPlanets) {
      count++
      
     	let planet = filteredPlanets[index]
    	let ranking = findRankingByPlayerName(planet.player_name)
      
      console.log(count + " z " + cc, planet)
      
      // Ustawienie współrzędnych
      $('#galaxyInput').val(planet.galaxy)
      $('#systemInput').val(planet.system)

      // Pobranie danych
      $('.x-btn-go')[0].click();

      // Oczekiwanie na załadowanie strony
      await EasySelenium.waitForElementNotExists('#BackGroundFreezerPreloader_Element');
      
      
      unsafeWindow.SendSpy(planet.galaxy, planet.system, planet.position, 1, false)
      await sleep(1_500)
      
      if (planet.hasMoon) {
        unsafeWindow.SendSpy(planet.galaxy, planet.system, planet.position, 2, false)
        await sleep(1_500)
      }
    }
  }
  
  async function sendEspionagesToPlayer(nickname) {
  	let planets = findPlanetsByNickname(nickname)
    
    for (index in planets) {
     	let planet = planets[index]
      
      unsafeWindow.SendSpy(planet.galaxy, planet.system, planet.position, 1, false)
      await sleep(2000)
    }
  }
  
  /**
   *	Wysłanie sond na farmy
   */
  function sendEspionages() {
    let max = countPossibleSlotsForAttack()
    let interval = 1_000

    // Działa
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

    // Ilość paczek 
    let packages = parseInt(elements.length / max) + 1
    let delayBetweenEach = 1_000
    
    for(let package = 0; package < packages; package++) {
      let delayBetweenPackages = package * (max > 30 ? max : 30) * delayBetweenEach 
          
      setTimeout(() => {
        for(let i = 0; i < max; i++) {
          let index = package * max + i

          setTimeout(() => {
            $('[data-auto-scan]').text('Auto scan ' + (i + 1) + ' z ' + max)

            let element = elements[index]
            $(element).attr('data-allow-auto-scan', 0).css('color', 'black')
            $(element).parent().parent().find('.btnActionSpy')[0].click()
          }, i * delayBetweenEach)
        }
      }, delayBetweenPackages)
    }
    
    

//     setTimeout(() => {
//       alert('Zakonczono')
//     }, packages 30 * 1000)
  }
  
  $(document).on('click', '#keep-attacking', function(event) {
    event.preventDefault();
    
    (async() => {
      
      let isOn = await EasyOGameX.State.is(STATE_AUTO_FARM)
          
      if (isOn) {
        await EasyOGameX.State.set(STATE_NOTHING, {}) 
      } else {     
        await EasyOGameX.State.set(STATE_AUTO_FARM, {}) 
      }
      
      unsafeWindow.location.reload()
    })();
  })
  
  async function autoFarmByFastEspionage() {
    let mainElement = $('[data-auto-farm="3"]')
    let max = countPossibleSlotsForAttack()
    let defineMax = $('#input-maximum-slots option:selected').val()
    
    if (defineMax != '*') {
    	max = Math.min(max, parseInt(defineMax))  
    }
    
    // input-maximum-slots
    
    let allElementsBeforeSort = $('.attack-item[data-allow-auto-farm]')
    	.filter((index, element) => {
	      let espionageId = $(element).data('espionage-id')
      	let resource = $(element).data('resource')

      	let hasResource = resource > settings.galaxy.farm.minimum_resource
        let hasEspionageId = espionageId != "-1"
        
        return hasResource && hasEspionageId
    	})
      .filter((index, element) => {

        let rowText = $(element).parent().parent().find('td:eq(5)').text().trim()
        let defineCoordinate = EasyOGameX.Utils.stringToCoordinate(rowText)
            
        let current = utils_getCurrentCoordinates()
        let currentCoordinate = EasyOGameX.Utils.stringToCoordinate(current)
        
        let isOnlyNearby = $('#input-only-nearby').is(':checked')
        
        if (isOnlyNearby) {
        	return defineCoordinate.isEquals(currentCoordinate)  
        }
        
        return true
      })
      .toArray()
    
    let allElements = allElementsBeforeSort
    	.sort((a, b) => { 
//         let aVal = parseInt(a.getAttribute('data-distance'));
//         let bVal = parseInt(b.getAttribute('data-distance'));

//         return aVal - bVal;  
        
        
        let aCoordinate = a.getAttribute('data-coordinate');
        let bCoordinate = b.getAttribute('data-coordinate');

      	let aSum = getSumOfResourceOnPlanetFromEspionage(aCoordinate)
        let bSum = getSumOfResourceOnPlanetFromEspionage(bCoordinate)
        
        if (aSum == -1 && bSum == -1) {
         	return 0 
        }
      
      	if (aSum > bSum) { return -1; }
      
      	return 1;
    	})
    
    let allElementsToFarm = $(allElements).getRange(0, max - 1);
        
    for(let index in allElementsToFarm) {
      let element = allElementsToFarm[index]

      let coordinate = EasyOGameX.Utils.stringToCoordinate($(element).attr('data-coordinate'));

      // Ustawienie współrzędnych
      $('#galaxyInput').val(coordinate.galaxy)
      $('#systemInput').val(coordinate.system)

      // Pobranie danych
      $('.x-btn-go')[0].click();

      // Oczekiwanie na załadowanie strony
      await EasySelenium.waitForElementNotExists('#BackGroundFreezerPreloader_Element');

      // Wysłanie floty
      let row = $('.galaxy-info .galaxy-item:not(.galaxy-item-head)').eq(coordinate.position - 1)
      let plunderElement = $('.btnActionPlunder', row)

      plunderElement[0].click()

      // Zapisanie że wysłano
      let serialize = await GM.getValue('galaxy', '{}');
      let data = JSON.parse(serialize)

      data[coordinate.toSimpleString()].last_attack = (new Date()).getTime()

      let serializeObj = JSON.stringify(data);
      await GM.setValue('galaxy', serializeObj);

      $(mainElement).text(index + " : " + allElementsToFarm.length)
      Logger.add("Fala nr " + (parseInt(index) + 1) + " / " + max)
    }
  }
  
  // Farmienie po nowemu
  $(document).on('click', '[data-auto-farm="3"]', function(event) {
    (async() => {
    	await autoFarmByFastEspionage()
     	alert('Koniec')
    })();
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
      
      	if (aSum > bSum) { return -1; }
      
      	return 1;
    }, (left, allSize) => "Auto Farm by distance (" + left + " / " + allSize + ")")
  })
  
  // Farmienie gdzie jako podstawa służy dystans
  $(document).on('click', '[data-auto-farm="1"]', function(event) {
    let mainElement = $(this)
      
    autoAttack(mainElement, (index, element) => {
      let distance = $(element).data('distance')
      
      return distance < 8
    }, (a, b) => { 
        let aVal = parseInt(a.getAttribute('data-distance'));
        let bVal = parseInt(b.getAttribute('data-distance'));

        return aVal - bVal;  
    }, (left, allSize) => "Auto Farm by distance (" + left + " / " + allSize + ")")
  })
  
  function autoAttack(mainElement, filtrBy, sortBy, labelCallback) {
      let max = countPossibleSlotsForAttack()
      let interval = 7_500

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

          let element = $(sortList).eq(i)

          let resource = $(element).data('resource')
          let ships = parseInt(resource / settings.galaxy.farm.capacity / 2);
              
          switch(true) {
            case resource == -1: ships = settings.galaxy.farm.ships; break;
            case ships < 1_000: ships = 1_000; break;   
            case ships < 50_000: ships = 50_000; break;
            case ships < 100_000: ships = 100_000; break;
            case ships < 300_000: ships = 300_000; break;
            case ships < 500_000: ships = 500_000; break;
            case ships < 750_000: ships = 750_000; break;
            case ships < 1_000_000: ships = 1_000_000; break;
            case ships < 2_000_000: ships = 2_000_000; break;
            case ships < 3_000_000: ships = 3_000_000; break;
            default:
              ships = settings.galaxy.farm.ships
          }
          
          (async() => { 
            await GM.setValue('auto-farm', 1);
            await GM.setValue('auto-farm-ships', ships);
                      

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
  let isAutoExpeditionPage = location.pathname == "/fleet/autoexpedition"
  let isProfilePage = location.pathname == "/home/playerprofile"
  let isRankingPage = location.pathname == "/statistics"
  
  if (isRankingPage) {
//   	setTimeout(function() {
      $('body').append(`
      	<a href="#" style="position: fixed; left: 0px; top: 0p; color: yellow" id="yourfrog-collect-statistic-data">collect</a>
      `)
//     }, 1000)	
  }
  
  if (isGalaxyPage) {
    setInterval(function() {
      utils_UpdateGalaxySystem()
    }, 100)  
    
    switch(true) {
      case await EasyOGameX.State.is(STATE_AUTO_FARM):
      		Logger.add("State: STATE_AUTO_FARM")
        
        	let selector = '#auto-farm[data-auto-farm="3"]'
        
        	// Oczekujemy na załadowanie flot
       	 	await EasySelenium.waitForElement(selector);
        
        	// Czekamy aż zakończy wysyłać
        	await autoFarmByFastEspionage()
        
        	// Odkładamy stronę do odświeżenia
        	setTimeout(() => { window.location.reload(); }, 60 * 1_000)
        break;
        
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
    
    
    // Na szybko tylko na farming
//     setTimeout(function() {
//       	window.location.reload()
//     }, randomInteger(1, 3) * 60 * 1_000)
    
//     await EasySelenium.waitForElement('[data-auto-farm="3"]');
    
//     $('[data-auto-farm="3"]')[0].click()
  }
  
	if (isMessagePage) {        
    setInterval(function() {
      (async() => {
        utils_UpdateCombatMessages()
      })()
    }, 1000)
    
    
    // Automatyczne oznaczanie farm na podstawie raportów szpiegowskich
    setInterval(() => {
			(async() => {
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
          let name = $('#spy-report-modal :contains("Player:")').find('span').eq(1).text().trim() // fullname.split('[')[0].replaceAll('[', '').trim()

          //////////
          //
          // Zebranie informacji o badaniach itp.
          //
          //////////
          let research = {
            astrophysics: $('span:contains("Astrophysics")').parent().find(':nth-child(3)').text().trim(),
            weapons: $('span:contains("Weapons Technology")').parent().find(':nth-child(3)').text().trim(),
            shield: $('span:contains("Shield Technology")').parent().find(':nth-child(3)').text().trim(),
            armour: $('span:contains("Armour Technology")').parent().find(':nth-child(3)').text().trim(),
            laser: $('span:contains("Laser Technology")').parent().find(':nth-child(3)').text().trim(),
            ion: $('span:contains("Ion Technology")').parent().find(':nth-child(3)').text().trim(),
            plasma: $('span:contains("Plasma Technology")').parent().find(':nth-child(3)').text().trim(),
            graviton: $('span:contains("Graviton Research")').parent().find(':nth-child(3)').text().trim()
          }

          let officers = {
            admiral: $('span:contains("Admiral")').parent().find(':nth-child(3)').text().trim(),
            emperor: $('span:contains("Emperor")').parent().find(':nth-child(3)').text().trim(),
            general: $('span:contains("General")').parent().find(':nth-child(3)').text().trim(),
            navigator: $('span:contains("Navigator")').parent().find(':nth-child(3)').text().trim(),
            engineer: $('span:contains("Engineer")').parent().find(':nth-child(3)').text().trim()
          }

          let academy = {
            plunder_protection: $('span:contains("Plunder protection")').parent().find(':nth-child(3)').text().trim(),

            weapon_mastery: $('span:contains("Weapon mastery")').parent().find(':nth-child(3)').text().trim(),
            armor_mastery: $('span:contains("Armor mastery")').parent().find(':nth-child(3)').text().trim(),
            shield_mastery: $('span:contains("Shield mastery")').parent().find(':nth-child(3)').text().trim(),
            faster_ships: $('span:contains("Faster ships")').parent().find(':nth-child(3)').text().trim(),
            
            expanding_of_the_empire: $('span:contains("Expanding of the empire")').parent().find(':nth-child(3)').text().trim(),
          }

          let player = findRankingByPlayerName(name)

          player.research = research
          player.officers = officers
          player.academy = academy

          let serializeObj = JSON.stringify(dataOfRanking);
          await GM.setValue('ranking', serializeObj);

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
              type: 'full',
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
      })()
    }, 1000)
  }
  
  if (isProfilePage) {
    switch(true) {
      case await EasyOGameX.State.is(STATE_AUTO_EXPEDITION_COLLECT_DATA):
     			await EasyOGameX.Script.Profile.updateStatistics()
        break;
        
      case await EasyOGameX.State.is(STATE_UPDATE_STATISTICS_ASTEROID):
     			await EasyOGameX.Script.Profile.updateStatistics()
          
        	let extra = await EasyOGameX.State.extra()
        	EasyOGameX.Navigator.goToPage('/fleet', STATE_SEND_MINNERS, extra)
        break;
    }
  }
  
  if (isAutoExpeditionPage) {
    
    switch(true) {
      case await EasyOGameX.State.is(STATE_AUTO_EXPEDITION_STEP_1) && await EasyOGameX.Data.Bot.Expedition.isOn():
        let extra = await EasyOGameX.State.extra()
        let delayToSend = randomInteger(settings.galaxy.expedition.delayBetweenMissions.minimum, settings.galaxy.expedition.delayBetweenMissions.maximum)
        
        if (extra.success == 0) {
        	delayToSend = 0  
        }
        
        if (extra.success >= extra.missionCount) {
          await EasyOGameX.Data.Bot.Expedition.off()
          
        	alert("Wysłano wszystkie ekspedycje")
          return
        }
        

        setTimeout(() => {
          (async() => {

            for(let name in extra.shipsEachExpedition) {
              let quantity = extra.shipsEachExpedition[name]

              unsafeWindow.AutoNumeric.getAutoNumericElement('div[data-ship-type="' + name + '"] input').set(quantity);
            }

            $('#expeditionCount').val("1").change()					// Ilosc ekspedycji, Zawsze 1
            $('#expeditionDuration').val(settings.galaxy.expedition.duration).change() 	  // 1 hour
            $('#expeditionFleetSpeed').val("100").change()	// 100% speed

            extra.success += 1
            await EasyOGameX.State.set(STATE_AUTO_EXPEDITION_STEP_1, extra)

            // Wysłanie floty
            unsafeWindow.CheckShipQuantity()
            EasySelenium.click('#btnSend')


            // Zaakceptowanie konfirmacji
            await EasySelenium.waitForElement('button.swal2-confirm:visible')

            EasySelenium.click('button.swal2-confirm')
          })()
        }, delayToSend)
        break;
    }
  }
  
  if (isFleetPage) {
    
    switch(true) {
      case await EasyOGameX.State.is(STATE_AUTO_EXPEDITION_COLLECT_DATA):
        break;
        
      case await EasyOGameX.State.is(STATE_NOTHING) && await EasyOGameX.Data.Bot.Expedition.isOn():
          // Zliczamy statki
          let ships = {}
          let shipsEachExpedition = {}

          let allowShips = settings.galaxy.expedition.allowShips

          let currentMissionCount = await EasyOGameX.Fleet.countOfExpedition()
          let leftExpeditionMissionCount = settings.galaxy.expedition.maximumExpeditionCount - currentMissionCount

          for(index in allowShips) {
            let name = allowShips[index]

            let count = $('[data-ship-type="' + name + '"]').data('ship-quantity')

            ships[name] = count
            shipsEachExpedition[name] = parseInt(count / leftExpeditionMissionCount)
          }

          let extra = {
            missionCount: leftExpeditionMissionCount,
            success: 0,
            ships: ships,
            shipsEachExpedition: shipsEachExpedition 
          }

          EasyOGameX.Navigator.goToPage('/fleet/autoexpedition', STATE_AUTO_EXPEDITION_STEP_1, extra)
        break;
    }
    
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

        let ships = await GM.getValue('auto-farm-ships', settings.galaxy.farm.ships);
        
        let parent = $('[data-ship-type="LIGHT_CARGO"]').parent()
        let element = $('input', parent).val(ships)

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
  let max = settings.galaxy.farm.validity_of_espionage_report_in_seconds


  if (diff > max) {
    return -1
  }

  let resource = farm.espionage.resource

  return parseInt(parseInt(resource.metal) + parseInt(resource.crystal) * 1.5 + parseInt(resource.deuter) * 3)
}

/**
 *	Zwraca identyfikator ostatniego skanowania 
 */	
function findLastEspionageIdByCoordinate(coordinate) {
  let farm = dataOfGalaxy[coordinate]
  let lastEspionageId = farm.lastEspionageId
  
  if (typeof farm.lastEspionageId == 'undefined') {
    return -1
  }
  
  return lastEspionageId
}

function findPlanetsByGalaxy(value) {
  let result = {}
  
 	for(cords in dataOfGalaxy) {
  	let planet = dataOfGalaxy[cords]
    
    
    if (planet.galaxy == value) {
    	result[cords] = planet
    }
  }
  
  return result
}

function findPlanetsByNickname(nickname) {
  let result = {}
  
 	for(cords in dataOfGalaxy) {
  	let planet = dataOfGalaxy[cords]
    
    
    if (planet.player_name == nickname) {
    	result[cords] = planet
      
      
// 			$('.planet-section:not(.easy-complete)').append(`
//       	<a class="planet-page" href="/galaxy?x=1&amp;y=287">
//                     <div class="planet-img" style="background:url(../../assets/images/V2/planet/22/22_small.jpg) no-repeat;"> </div>
//                     <div class="planet-name">` + planet.planet_name + `</div>
//                     <div class="planet-coord">[` + cords + `]</div>
// 				</a>
//       `)
    }
 	}
  
  return result
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
  
  $(document).on('click', '#messages-container .x-remove-msg-category', function(event) {
    event.preventDefault()

    var category = $(this).data('msg-category');
    unsafeWindow.removeMsgCategory(category);
  });

  $(document).on('click', '.yourfrog-change-planet', function(event) {
    let cords = $(this).text()
    let element = $('span.planet-coords:contains("' + cords + '")').parent()
    
    
    $(element)[0].click()
  });
                 
  (async() => {
		// await GM.setValue('galaxy', '{}');
    
    let serialize = ''
    
    serialize = await GM.getValue('galaxy', '{}');
    dataOfGalaxy = JSON.parse(serialize)
    
    
    serialize = await GM.getValue('ranking', '{}');
    dataOfRanking = JSON.parse(serialize)
    
    setInterval(() => {
    	$('.planet-section').addClass('easy-complete')
    }, 500)
    
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

/**
 *	Dodaje informacje o rankingu w galaktyce
 */
function utils_addRankingToNicknameInGalaxy() {
  if (!settings.galaxy.isShowPlayerRanking) { return }
  
  $('.galaxy-col.col-player:not(.header-col)').each((index, element) => {
    let html = $('a > span', element).attr('data-tooltip-content')
    let item = $(html).find(':contains("Ranking")').parent().find('a').eq(0)

    let ranking = item.text()
    let isProcessed = $('a > span > span.easy-ranking', element).length != 0

    if (!isProcessed) {
      $('a', element).eq(0).append('&nbsp;<span style="color: gold;font-size: 9px;" class="easy-ranking">' + ranking + '</span>')
    }
  }) 
}

function utils_UpdateGalaxySystem() {    
  	if ($('.galaxy-info.scan').length == 1) {
      return
    }
  
  	$('.galaxy-info').addClass('scan')
    let planets = []
    
    utils_addRankingToNicknameInGalaxy()
    
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

      let getPlanetActivity = function getPlanetActivity(parent) {
        let activityStar = $('.col-planet-index .planet-activity', parent)
        let activityMinutes = $('.col-planet-index .planet-activity-timer', parent)
        let activity = null

        if (activityStar.length == 1) {
          activity = '*' 
        } else if (activityMinutes.length == 1) {
          activity = activityMinutes.text()
        }
        
        return activity
      }

      let getMoonActivity = function getPlanetActivity(parent) {
        let activityStar = $('.col-moon .planet-activity', parent)
        let activityMinutes = $('.col-moon .planet-activity-timer', parent)
        let activity = null

        if (activityStar.length == 1) {
          activity = '*' 
        } else if (activityMinutes.length == 1) {
          activity = activityMinutes.text()
        }
        
        return activity
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
      item.is_noob = $('.col-player .isNoob.tooltip', this).length == 1
      item.is_strong = $('.col-player .isStrong.tooltip', this).length == 1
      item.is_banned = $('.col-player .isBanned.tooltip', this).length == 1
      item.debris = debris
      item.planet_activity = {
        value: getPlanetActivity(this),
      	updateAt: (new Date()).getTime()  
      }
     
      item.moon_activity = {
        value: getMoonActivity(this),
      	updateAt: (new Date()).getTime()  
      }
      
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
    
    if (!item.is_inactive7 && !item.is_inactive28) {
     	continue 
    }
    
    if (item.is_vacation) {
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
    
    let maximumTimeForTimer = settings.galaxy.farm.minimumDelayBetweenAttacks
    
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
    
    if (sumOfResource != -1 && sumOfResource < settings.galaxy.farm.minimum_resource) {
    	highlight = 'silver';    
    }
    
    attribute += `data-resource="` + sumOfResource + `" data-espionage-id="` + findLastEspionageIdByCoordinate(item.galaxy + `:` + item.system + `:` + item.position) + `"`
    
    content += `
    	<tr>
      	<td>` + item.ranking + `</td>
        <td data-order="` + item.system + `">
            <a href="fleet?x=` + item.galaxy + `&y=` + item.system + `&z=` + item.position + `&planet=1&mission=8" class="attack-item" ` + attribute  + ` data-galaxy="` + item.galaxy + `" data-system="` + item.system + `" data-position="` + item.position + `"  ` + (allowAutoFarm ? 'data-allow-auto-farm="1"' : '') + `>
            	<span style="color: ` + highlight + `">
              	 ` + item.cords + ` 
              </span>
            </a>
				</td>
        <td>` + distance + `</td>
        <td data-order="` + (sumOfResource > 0 && showResource ? sumOfResource : 0) + `"><span>` + (sumOfResource > 0 && showResource ? sumOfResource.toLocaleString() : '') + `</span></td>
        <td>` + (lastAttackInSeconds > 0 && lastAttackInSeconds < maximumTimeForTimer ? secondsToReadable(lastAttackInSeconds) : '') + `</td>
        <td>
        	<a href="#" style="color: white;" class="yourfrog-change-planet">` + findNearbyPlanet(item.galaxy + `:` + item.system + `:` + item.position) + `</a>
        </td>
        <td>
            <a href="#" class="btnActionSpy tooltip" onclick="SendSpy(` + item.galaxy + `,` + item.system + `, ` + item.position + ` ,1,false); return false;" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Spy</div>" style="font-size: 7px; color: white;">Szpieguj</a>
            <a href="https://hyper.ogamex.net/galaxy?x=` + item.galaxy + `&y=` + item.system + `" style="font-size: 7px; color: white;">Galaktyka</a>
				</td>              
			</tr>
    `
  }
  
  let autoFarmIsOn = await EasyOGameX.State.is(STATE_AUTO_FARM)
  
  $('#yourfrog-idlers').remove()
  $('#galaxy-container').append(`
  	<div id="yourfrog-idlers" style="padding: 20px;">
    	<h5>Idlers</h5>
      
      <ul style="margin: 20px; 0px;"s>
      	<li><a href="#keep-attacking" style="color: white;" id="keep-attacking">Keep attacking (` + (autoFarmIsOn ? 'On' : 'Off') + `)</a></li>
      	<li><a href="#auto-farm" data-auto-farm="1" style="color: white;" id="auto-farm">Auto Farm by distance</a></li>
      	<li><a href="#auto-farm" data-auto-farm="2" style="color: white;" id="auto-farm">Auto Farm by resource</a></li>
      	<li><a href="#auto-farm" data-auto-farm="3" style="color: white;" id="auto-farm">Auto Farm by fast espionage</a></li>
      	<li><a href="#auto-scan" data-auto-scan="1" style="color: white;" id="auto-scan">Auto scan</a></li>
      	<li><a href="#auto-scan" data-auto-scan="2" style="color: white;" id="auto-scan">Auto scan - Players</a></li>
      </ul>
      
      <ul style="float: right">
      	<li>Legenda kolorów</li>
	      <li><span style="font-size: 7px; color:lime">Dawno nie atakowany</span></li>
  	    <li><span style="font-size: 7px; color:orange">Zaatakowany niedawno</span></li>
    	  <li><span style="font-size: 7px; color:pink">Posiada debris</span></li>
    	  <li><span style="font-size: 7px; color:red">Słaba farma</span></li>
    	  <li><span style="font-size: 7px; color:gold">Dobra farma</span></li>
    	  <li><span style="font-size: 7px; color:silver">Zbyt mało surowców</span></li>
      </ul>
      
      <div>
      	<div style="font-size: 8px;">
	      	<input type="checkbox" id="input-only-nearby" value="1"/> <label for="input-only-nearby">Atakuj z najbliższej planety (tylko dla Auto Farm by fast espionage)</label>
  			</div>
        <div>
        	<select id="input-maximum-slots">
          	<option value="*">All available slots</option>
          	<option value="5">5 slots</option>
          	<option value="10">10 slots</option>
          	<option value="15">15 slots</option>
          	<option value="20">20 slots</option>
          	<option value="25">25 slots</option>
          	<option value="30">30 slots</option>
          	<option value="35">35 slots</option>
          	<option value="40">40 slots</option>
          	<option value="45">45 slots</option>
          	<option value="50">50 slots</option>
          	<option value="55">55 slots</option>
          	<option value="60">60 slots</option>
          	<option value="65">65 slots</option>
          	<option value="70">70 slots</option>
          	<option value="75">75 slots</option>
          	<option value="80">80 slots</option>
          </select>
        </div>
        
        <table style="font-size: 11px;width: 100%;margin-top: 10px;" id="farm-table">
          <thead>
            <tr>
              <td>Ranking</td>
              <td>Współrzędne</td>
              <td>Dystans</td>
              <td>Surowce</td>
              <td>Ostatni atak</td>
              <td>Najbliższa planeta</td>
              <td>Akcje</td>
            </tr>
          </thead>
          <tbody>
            ` + content + `
          </tbody>
        </table>
      </div>
    </div>
  `)
  
  
  let table = new DataTable('#farm-table', {
    searching: false,
    paging: false,
    order: [
        [3, 'asc']
    ]
  });
}

function findNearbyPlanet(farm) {
  let current = EasyOGameX.Utils.stringToCoordinate(farm)
	let availablePlanets = settings.galaxy.farm.availablePlanets
  
  let result = null
  
  for(let index in availablePlanets) {
  	let other = availablePlanets[index]
    
    let otherCoordinate = EasyOGameX.Utils.stringToCoordinate(other.coordinates)
  
    let distance = otherCoordinate.distanceTo(current)

    
    if (result == null || result.distance > distance) {
     	result = {
        source: other,
       	distance: distance 
      }
    }
  }
  
  return result.source.coordinates
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

const sleep = ms => new Promise(r => setTimeout(r, ms));
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
          resolve()
					observer.disconnect();
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
    },
    
    /**
     *	Zliczenie aktualnie trwającej ilości ekspedycji
     */
    countOfExpedition: async function() {
      let isOpen = $('#layoutFleetMovements.fleet-movement-wrapper.opened').length == 1
          
      if (!isOpen) {
      	// Próba otwarcia zakładki z flotą
        if (!EasySelenium.click('#fleet-movement-detail-btn')) { return 0 }
        
        // Oczekujemy na załadowanie flot
        await EasySelenium.waitForElement('#layoutFleetMovements.fleet-movement-wrapper.opened');
      }
      
      let count = $('#layoutFleetMovements .row-mission-type-EXPEDITION.row-fleet-return').length
      
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
			
      console.log(data.ranges)
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
			
      console.log('return result')
			return result
		}	
	},
	Utils: {
    Espionage: {
    	extractEspionageId: function(parent) {
        return $(parent).data('msg-id')
      },
      
      extractEspionageCoordinates: function(parent) {
        let coordinate = $('.message-head .head-left a', parent).eq(0).text().split('[')[1].split(']')[0]
            
        let obj = EasyOGameX.Utils.stringToCoordinate(coordinate)
        
        return obj
      }
    },
    
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
      },
      
      /**
       *	Funkcje dotyczące bota od ekspedycji
       */
      Expedition: {
        isOn: async function() {
        	return await GM.getValue('data.bot.expedition.is_on', false)  
        },
        
        isOff: async function() {
          return !EasyOGameX.Bot.Expedition.isOn()
        },
        
        off: async function() {
          await GM.setValue('data.bot.expedition.is_on', false);
        },
        
        toggle: async function() {
          let value = await EasyOGameX.Data.Bot.Expedition.isOn()
          
          await GM.setValue('data.bot.expedition.is_on', !value);
        }
      }
    },
    Account: {
      Expeditions: {
        isExceeded: async function() {
          let data = await GM.getValue('data.account.expeditions.today', {
          	value: -1,
            updateAt: 0
          });
            
            
          let now = (new Date()).getTime()
          
         	return now > data.updateAt + 5 * 60 * 1000 // Ważność asteroid to 5 minut
        },
              
       	countToday: async function() {
          let data = await GM.getValue('data.account.expeditions.today', {
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
          
      		await GM.setValue('data.account.expeditions.today', data);
        }
      },
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
        let successfulMissions
        
        ///// EXPY
        $('.navigation .nav-item:contains("Expedition Journal")')[0].click() 
        await EasySelenium.waitForElement('#expoLogsTable:visible, #profile-tab-expoLog .no-entries-journal'); 
        successfulMissions = $('#expoLogsTable tbody tr td:nth-child(2):not(:contains("Empty"))').length 
        
        EasyOGameX.Data.Account.Expeditions.setToday(successfulMissions)
        
        //// ASTEROIDY
        $('.navigation .nav-item:contains("Asteroid Journal")')[0].click() 
        await EasySelenium.waitForElement('#asteroidLogTable:visible, #profile-tab-astreoidLog .no-entries-journal');
        successfulMissions = $('#asteroidLogTable tbody tr td:nth-child(2):not(:contains("Empty"))').length 

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

        console.log('a')
        await EasySelenium.waitForElement('#playerAsteroidTable');
        
        console.log('b')
        await EasyOGameX.Galaxy.getSystemsWithAsteroids()
        
        console.log('c')
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
  
  this.distanceTo = function(other) {
  	if (this.galaxy != other.galaxy) {
    	return Math.abs(this.system - other.system) * 500 + Math.abs(this.system - other.system);  
    }
    
    return Math.abs(this.system - other.system)
  }
  
  this.toSimpleString = function() {
   	return this.galaxy + ":" + this.system + ":" + this.position 
  }
  
  this.toFullString = function() {
   	return "[" + this.toSimpleString() + "]" 
  }
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


