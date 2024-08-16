// ==UserScript==
// @name     YourFrog - OGameX - Resource
// @version  1
// @include  *hyper.ogamex.net/home*
// @include  *hyper.ogamex.net/messages*
// @include  *hyper.ogamex.net/hangar*
// @include  *hyper.ogamex.net/defense*
// @include  *hyper.ogamex.net/research*
// @include  *hyper.ogamex.net/empire*
// @include  *hyper.ogamex.net/fleet*
// @include  *hyper.ogamex.net/building/facility*
// @include  *hyper.ogamex.net/building/resource*
// @include  *https://hyper.ogamex.net/fleet/distributeresources*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @updateURL 
// @version 1
// @grant           GM.setValue
// @grant           GM.getValue
// ==/UserScript==

/************************************************/
/*                                              */
/*					=== Stałe, nie ruszać ===						*/
/*																							*/
/************************************************/
const TYPE_PLANET = 0
const TYPE_MOON = 1

const STATE_NOTHING = 0
const STATE_GO_TO_DISTRIBUTE = 1
const STATE_AUTOMATIC_SEND_RESOURCE = 2
const STATE_NO_DATA = 3
const STATE_READ_FROM_EMPIRE = 4
const STATE_MOVE_TO_TAB_ON_PLANET = 5

/************************************************/
/*                                              */
/*						=== Konfiguracja ===							*/
/*																							*/
/************************************************/
const config = {
  
  /************************************************/
  /*                                              */
  /*						=== Dystrybucja ===							 	*/
  /*																							*/
  /************************************************/
	distribute: {
  	// True - Wysyłaj automatycznie po kliknięciu guzika na kopalni, False - Jedynie zapamiętaj surowce
    automatically: true,
    
    // Dane planety z której następuje automatyczne rozsyłanie surowców
  	from: {
      // Współrzędne planety, Format: {system}:{układ}:{pozycja}
//   		coordinates: "1:145:8", 
  		coordinates: "1:287:9", 
      
      // Enum: TYPE_PLANET, TYPE_MOON
  		type: TYPE_PLANET
		}
	}
}

////
// Allow state:
// - 0 -> Nothing
// - 1 -> Go to Distribute
// - 2 -> Automatic send resource when have
let state = 0

let planets = {}
let empire = {}

function utils_getCurrentCoordinates() {
	return $('a.planet-select.selected span.planet-coords').clone().children().remove().end().text().trim();  
}

function utils_parseConstructionTime(constructionTimeText) {

  let split = constructionTimeText.split(":").map(function(num) { return parseInt(num, 10); });
  let seconds = 0;

  switch(split.length) {
    case 2: seconds = split[0] * 60 + split[1]; break;
    case 3: seconds = split[0] * 3600 + split[1] * 60 + split[2]; break;
  }
      
  return seconds
}

/**
 *	Aktualizacja informacji o surowcach na aktualnej planecie
 */
function updateResourceInformation() {
  let cords = utils_getCurrentCoordinates()
  let planet = planets[cords]
  
  if (typeof planet == 'undefined') { return }
  if (typeof unsafeWindow.resources == 'undefined') { return }
  
  let resources = unsafeWindow.resources
      
  planet.resources = {
   	metal: {
     	storage: resources.metalStorageCapacity,
      production: resources.metalProduction,
      value: resources.initialMetal 
    },
   	crystal: {
     	storage: resources.crystalStorageCapacity,
      production: resources.crystalProduction,
      value: resources.initialCrystal 
    },
   	deuter: {
     	storage: resources.deuteriumStorageCapacity,
      production: resources.deuteriumProduction,
      value: resources.initialDeuterium 
    },
    updateAt: (new Date()).getTime()
  }
  
}

/**
 *	Aktualizuje informacje o aktywności na planecie
 */
function updatePlanetActivity() {
  let cords = utils_getCurrentCoordinates()
  let planet = planets[cords]
  
  if (typeof planet != "undefined") {
  	planet.last_activity = (new Date()).getTime()
  }
}

async function state_reset() {
  await GM.setValue('script_state', STATE_NOTHING);
}

async function state_set(value) {
  await GM.setValue('script_state', value);
  
}

async function state_get() {
  return await GM.getValue('script_state', STATE_NOTHING);
}

async function empire_load() {
  let serialize = await GM.getValue('empire', '{}');
  let obj = JSON.parse(serialize)
  
  return obj
}

async function empire_save() {
  await GM.setValue('empire', JSON.stringify(empire));
}  

/**
 *	Przejście na stronę z automatycznym ustawieniem stanu skryptu
 */
async function goToPage(pathname, scriptState) {
  
  if (typeof scriptState == "undefined") {
    scriptState = STATE_NOTHING
  }
  
  state_set(scriptState)
  window.location = pathname
}

/**
 *	Załadowanie surowców i wysłanie ich do zapamiętanej planety
 */
async function distributeLoad() {
  let serialize = await GM.getValue('distribute-save');
  let obj = JSON.parse(serialize)

  $('span:contains("Heavy Cargo")').trigger("click");
  $('span:contains("Light Cargo")').trigger("click");

  unsafeWindow.AutoNumeric.getAutoNumericElement('#resource-input-metal').set(parseInt(obj.metal) + 10);
  unsafeWindow.AutoNumeric.getAutoNumericElement('#resource-input-crystal').set(parseInt(obj.crystal) + 10);
  unsafeWindow.AutoNumeric.getAutoNumericElement('#resource-input-deuterium').set(parseInt(obj.deuter) + 10);

  $('#distribute-resources-container .right-side span:contains("' + obj.cords + '")').eq(0).trigger("click")

  setTimeout(() => {
    $('#distribute-resources-container .right-side #btnSend')[0].click();
    
    setTimeout(() => {
      let isSuccess = $('.x-planet-fleet-success:visible').length == 1
      
      if (isSuccess) {
        goToPage("/building/resource", STATE_NOTHING)
      } else {
       	alert('Nie wysłano surowców') 
      }
    }, 1000)
  }, 500);
}

  
/**
 *	Pobiera uchwyt do elementu "a" służącego jako przejście na planetę / moon
 */
function getPlanetOrMoonElement(coordinate, type) {
	let result = null
  
  switch(type) {
    case TYPE_PLANET:
      	result = $('span.planet-coords:contains("' + coordinate + '")')
      break;
      
    case TYPE_MOON:
        result = $('span.planet-coords:contains("' + coordinate + '")').parent().parent().find('.moon-select')
      break;
  }

  if (result == null || result.length == 0) {
   	return null;
  }

  return result;
}

/**
 *	Przenosi do zakładki z wybraną planetą
 */
async function moveToTabOnSpecificPlanet(coordinate, pathname) {
  state_set(STATE_MOVE_TO_TAB_ON_PLANET)
  await GM.setValue('script_pathname', pathname);
  
  let element = getPlanetOrMoonElement(coordinate, TYPE_PLANET);
  
  element[0].click()
}

/**
 *	Uruchomienie skryptu
 */
async function runScript() {
  state = await GM.getValue('script_state', '{}');
  empire = await empire_load()
  
  switch(state) {
    case STATE_GO_TO_DISTRIBUTE: 
      	goToPage("/fleet/distributeresources", STATE_AUTOMATIC_SEND_RESOURCE)
	      return;
      break;  
      
    case STATE_AUTOMATIC_SEND_RESOURCE:
	      state_reset()
      	distributeLoad()
	      return
      break;
      
    case STATE_NO_DATA:
      	goToPage("/empire", STATE_READ_FROM_EMPIRE)
      break
      
    case STATE_READ_FROM_EMPIRE:
	      runScript_Empire()
      	goToPage("/home", STATE_NOTHING)
      break
      
    case STATE_MOVE_TO_TAB_ON_PLANET:
      	let pathname = await GM.getValue('script_pathname', '/home');
      	goToPage(pathname, STATE_NOTHING)
      break;
  }
  
  
  
  let isEmpirePage = location.pathname == "/empire"
  let isHomePage = location.pathname == "/home"
  let isResourcePage = location.pathname == "/building/resource"
  
  if (isEmpirePage) {
	  runScript_Empire()
    return
  }
  
	let jsonSerialize = await GM.getValue('planets', '{}');
  planets = JSON.parse(jsonSerialize)
  
  updateResourceInformation()
  updatePlanetActivity()
  
  if (isHomePage) {
		runScript_Home()
  }
  
  if (isResourcePage) {
   	runScript_Resource() 
  }
  
  let now = (new Date()).getTime()
  
  if (typeof empire.updateAt == 'undefined' || now - empire.updateAt >= 5 * 60 * 1000) {
    $('#left-menu-1').prepend(`
        <div class="menu-item">
          <a href="#" class="text-item" style="font-size: 8px;color: orange" id="yourfrog-distribute-refresh">Distribute refresh</a>
        </div>
    `)
  }
  
  
  $(document).on('click', '#yourfrog-distribute-refresh', function() { 
    (async() => {
      	goToPage("/empire", STATE_READ_FROM_EMPIRE)
    })()
  })
  
	YourFrogTiming(unsafeWindow.resources);
  
  
  $(document).on('click', '.yourfrog-distribute-save', function() {
    	let cords = utils_getCurrentCoordinates()    
    	let obj = {
        metal: $(this).attr('data-metal'),
        crystal: $(this).attr('data-crystal'),
        deuter: $(this).attr('data-deuter'),
        cords: cords
  		}
      
      let serialize = JSON.stringify(obj);
                 
    
	    (async() => {
        await GM.setValue('distribute-save', serialize);
        
        if (config.distribute.automatically) {
          let element = getPlanetOrMoonElement(config.distribute.from.coordinates, config.distribute.from.type);
          
          if (element == null) {
          	alert('Błędna konfiguracja. Sprawdź współrzędne oraz typ.');
          } else {
        		await GM.setValue('script_state', STATE_GO_TO_DISTRIBUTE);
            element[0].click();
          }
        } else {
          alert('Zapamiętano brakującą ilość surowców')
        }
      })()
  });
  
  
  ///////////////////////// Poziomy budynków
  (async() => {
    if (location.pathname == "/building/resource") {
      let cords = utils_getCurrentCoordinates()
      let key = JSON.stringify(cords)

      let planet = planets[cords]
      
      planets[cords] = {
        showWarning: false,
        levels: {
          metal: parseInt($('a[data-building-type="METAL_MINE"] span').eq(0).text()),
          crystal: parseInt($('a[data-building-type="CRYSTAL_MINE"] span').eq(0).text()),
          deuter: parseInt($('a[data-building-type="DEUTERIUM_REFINERY"] span').eq(0).text()),
        },
        construction: planet ? planet.construction : undefined
      }

      // Zaaktualizujemy informacje na tej planecie
      updateResourceInformation()
      updatePlanetActivity()
      
      await YourFrogAddMineLevelsToPlanets()
    } else {
      await YourFrogAddMineLevelsToPlanets()
    }
	})();
  ///////////////////////// Dystrybucja
  
  
  $('#distribute-resources-container .right-side .content').prepend(`
  	<a href="#" class="btn-send yourfrog-distribute-load"><span>Send from Distribute</span></a>
  `);
  
  $(document).on('click', '.yourfrog-distribute-load', function() {     
	    (async() => {
        distributeLoad()
      })()
  });  
  
  
  $(document).on('click', '.yourfrog-energy-icon', function(event) {   
    event.preventDefault();
    
    (async() => {
      let coordinate = $(this).attr('data-coordinate')
      moveToTabOnSpecificPlanet(coordinate, "/hangar")
    })()
  }); 
  
  $(document).on('click', '.yourfrog-fields-icon', function(event) {   
    event.preventDefault();
    
    (async() => {
      let coordinate = $(this).attr('data-coordinate')
      moveToTabOnSpecificPlanet(coordinate, "/building/facility")
    })()
  }); 
  
  await GM.setValue('planets', JSON.stringify(planets));
  
  
  setTimeout(function() {
    $('span[data-construction-time]').each(function() {
      
    })
  }, 1000)
  
  setInterval(function() {
    $('.resource-timer').each(function() {
      let data = {
      	production: $(this).data('production'),
        initial: $(this).data('inital'),
        updateAt: $(this).data('date')
    	}
                
      let now = (new Date()).getTime()
      let diffInSeconds = (now - data.updateAt) / 1000
      
      let value = diffInSeconds * data.production + data.initial
      let readableValue = YourFrogResourceAmountFormat(value)
      
      $(this).text(readableValue)
    })
    
  }, 1000)
  
  
  
  unsafeWindow.ConfigureTooltips();
}

async function runScript_Resource() {
  let coordinates = utils_getCurrentCoordinates()
  let planet = planets[coordinates]
  
  if (typeof planet === 'undefined') { return }
  
  let elements = $('#firstConstruction div')
  
  let isUpgradeMetal = $('span:contains("Metal Mine")', elements).length == 1
  let isUpgradeCrystal = $('span:contains("Crystal Mine")', elements).length == 1
  let isUpgradeDeuter = $('span:contains("Deuterium Refinery")', elements).length == 1
	
  if (isUpgradeMetal || isUpgradeCrystal || isUpgradeDeuter) {
    await updatePlanet(coordinates, (planet) => {
      let constructionTimeText = $('#firstConstructionRemainingTime', elements).text()
      let seconds = utils_parseConstructionTime(constructionTimeText)
      let now = (new Date()).getTime()

      planet.construction = {
        left: seconds,
        updateAt: now
      }
    })
  } else {
   	planet.construction = undefined 
  }
}

async function runScript_Home() {
  //////////////////////////////////////////////
  
  let elementMetal = $('#overview-bottom .smallbox span:contains("Metal Mine")')
	let elementCrystal = $('#overview-bottom .smallbox span:contains("Crystal Mine")')
  let elementDeuter = $('#overview-bottom .smallbox span:contains("Deuterium Refinery")')
    
  let isUpgradeMetal = elementMetal.length == 1
  let isUpgradeCrystal = elementCrystal.length == 1
  let isUpgradeDeuter = elementDeuter.length == 1
  
  let coordinates = utils_getCurrentCoordinates()
  
  if (isUpgradeMetal || isUpgradeCrystal || isUpgradeDeuter) {
    let constructionTime;
    
    if (isUpgradeMetal) { constructionTime = $(elementMetal).parent().find('#buildingConstructionTime').text() }
    if (isUpgradeCrystal) { constructionTime = $(elementCrystal).parent().find('#buildingConstructionTime').text() }
    if (isUpgradeDeuter) { constructionTime = $(elementDeuter).parent().find('#buildingConstructionTime').text() }
    
     
    await updatePlanet(coordinates, (planet) => {
      let constructionTimeText = constructionTime
      let seconds = utils_parseConstructionTime(constructionTimeText)
  		let now = (new Date()).getTime()
      
      planet.construction = {
        left: seconds,
        updateAt: now
      }
    })
  } else {
    await updatePlanet(coordinates, (planet) => {
      planet.construction = undefined
    })
  }
}

async function updatePlanet(coordinates, callback) {
  let planet = planets[coordinates]
  
  if (typeof planet === 'undefined') { return }
  
  callback(planet)
}

/**
 *	Wyciągnięcie informacji co sie dzieje na planecie z paska z listą planet
 */
function extractUpgradeInformation() {
	let result = {}
	
	$('#other-planets .planet-item .planet-coords').each(function() {
		let cords = $(this).clone().children().remove().end().text().trim()
		let data = {
			isBuildingUpgrade: $('.fa-industry', this).length == 1,
		}

		if (data.isBuildingUpgrade) {
			let tooltipContent = $('.fa-industry', this).data('tooltip-content')
			let tooltip = $(tooltipContent).text()
			
			data.buildingData = {
				name: tooltip.split("(")[0].trim(),
				toLevel: tooltip.match(/\d+/)[0]
			}
		}
		
		result[cords] = data
	});
	
	return result
}

async function YourFrogAddMineLevelsToPlanets() {
  let obj = planets
  
  let minimum = {metal: 9999, crystal: 9999, deuter: 9999}
  
  for(cords in obj) {
    let data = obj[cords]
		let upgrade = extractUpgradeInformation()[cords]
    
    if (typeof upgrade === 'undefined' || typeof upgrade.isBuildingUpgrade === 'undefined') { continue }
    
    let isMetalUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Metal Mine'
    let isCrystalUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Crystal Mine'
    let isDeuterUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Deuterium Refinery'

    let currentLevels = {
     	metal: data.levels.metal + (isMetalUpgrade ? 1 : 0),
      crystal: data.levels.crystal + (isCrystalUpgrade ? 1 : 0),
      deuter: data.levels.deuter + (isDeuterUpgrade ? 1 : 0)
    }
    
    minimum.metal = Math.min(minimum.metal, currentLevels.metal)
    minimum.crystal = Math.min(minimum.crystal, currentLevels.crystal)
    minimum.deuter = Math.min(minimum.deuter, currentLevels.deuter)
    
    if (obj[cords].showWarning == false) {
    	obj[cords].showWarning = isMetalUpgrade || isCrystalUpgrade || isDeuterUpgrade
    }
    
  }
  
  // Utrzymuj proporcje 4 - 0 - (-2)
  if (minimum.deuter + 2 < minimum.crystal) {
    minimum.metal = 0
    minimum.crystal = 0
  } else {
    
    if (minimum.crystal + 4 < minimum.metal) {
      minimum.metal = 0
      minimum.deuter = 0
    } else {
      minimum.crystal = 0
      minimum.deuter = 0
    }
  }
  
  for(cords in obj) {
    let data = obj[cords]
		let upgrade = extractUpgradeInformation()[cords]
    
    if (typeof upgrade === 'undefined' || typeof upgrade.isBuildingUpgrade === 'undefined') { continue }
    
    
    let isMetalUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Metal Mine'
    let isCrystalUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Crystal Mine'
    let isDeuterUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Deuterium Refinery'

    // Jeżeli mamy wyświetlić warning to upewnijmy się że żadna kopalnia nie jest budowana
    let showWarning = data.showWarning ? !(isMetalUpgrade || isCrystalUpgrade || isDeuterUpgrade) : false
    
    YourFrogAddMineLevelsToPlanet(showWarning, cords, data.levels, data.resources, minimum, data.construction)
  }  
}


function YourFrogGetEnergyIcon(coordinate) {
  let data = empire.planets[coordinate]

  if (data.energy < 0) {
    return `
        <i class="fas fa-exclamation-triangle tooltip yourfrog-energy-icon" data-coordinate="` + coordinate + `" data-tooltip-position="top" style="color: #CCC;padding: 2px 5px;border-radius: 3px;color: red;position: absolute; right: 0px; top: 0px;" data-tooltip-content="<div style='font-size:11px;color:#DDD;'>Brakuje energi: ` + data.energy + `</div>"></i>
    `
  }
    
  return ''
}

function YourFrogGetFieldsIcon(coordinate) {
  let data = empire.planets[coordinate]
  let left = data.fields.max - data.fields.current 
      
  if (left <= 3) {
    return `
        <i class="fas fa-exclamation-triangle tooltip yourfrog-fields-icon" data-coordinate="` + coordinate + `" data-tooltip-position="top" style="color: #CCC;padding: 2px 5px;border-radius: 3px;color: red;position: absolute; right: 0px; top: 0px;" data-tooltip-content="<div style='font-size:11px;color:#DDD;'>Pozostało ` + left + ` pól</div>"></i>
    `
  }
    
  return ''
}

function YourFrogAddMineLevelsToPlanet(showWarning, cords, levels, resources, minimumLevels, construction) {
	let upgrade = extractUpgradeInformation()[cords]
  if (typeof upgrade === 'undefined' || typeof upgrade.isBuildingUpgrade === 'undefined') { return }
  
  let isMetalUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Metal Mine'
  let isCrystalUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Crystal Mine'
  let isDeuterUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Deuterium Refinery'
      
  let currentLevels = {
    metal: levels.metal + (isMetalUpgrade ? 1 : 0),
    crystal: levels.crystal + (isCrystalUpgrade ? 1 : 0),
    deuter: levels.deuter + (isDeuterUpgrade ? 1 : 0)
  }
  
  let colors = {
  	metal: (currentLevels.metal > minimumLevels.metal ? '#ffaacca1' : 'gold'),
  	crystal: (currentLevels.crystal > minimumLevels.crystal ? '#73e5ffc7' : 'gold'),
  	deuter: (currentLevels.deuter > minimumLevels.deuter ? '#a6e0b0' : 'gold')  
  };
  
  let warningContent = ''
  let constructionContent = ''
  let energyIconContent = YourFrogGetEnergyIcon(cords)
  let fieldsIconContent = YourFrogGetFieldsIcon(cords)
  
  if (showWarning) {
   	warningContent = `
    	<i class="fas fa-exclamation-triangle" style="color: #CCC;padding: 2px 5px;border-radius: 3px;color: orange"></i>
    `
  } else {
    if (typeof construction  !== "undefined") {
      let now = (new Date()).getTime()
			let ageInSeconds = parseInt((now - construction.updateAt) / 1000)
      let leftInSeconds = construction.left - ageInSeconds
          
      if (leftInSeconds > 0) {
        constructionContent = `
          <span data-construction-time="` + leftInSeconds + `">` +  secondsToReadable(leftInSeconds)  + `</span>
        `
      }
    }
  }
  
  let contentOfResource = ''
  
  if (resources) {
    let now = (new Date()).getTime()
    let diffInSeconds = (now - resources.updateAt) / 1000

    if (diffInSeconds < 5 * 60) {
      let opacity = 1 - (diffInSeconds / (5 * 60))
      
      contentOfResource = `
        <div style="opacity: ` + opacity + `">
          <span style="font-size: 7px;color: #ffaacca1" class="resource-timer" data-production="` + resources.metal.production + `" data-inital="` + resources.metal.value + `" data-date="` + resources.updateAt + `">
          	` + (resources ? YourFrogResourceAmountFormat(resources.metal.value) : '?')  + `
          </span>
          <span style="font-size: 7px;color: #73e5ffc7" class="resource-timer" data-production="` + resources.crystal.production + `" data-inital="` + resources.crystal.value + `" data-date="` + resources.updateAt + `">
          	` + (resources ? YourFrogResourceAmountFormat(resources.crystal.value) : '?')  + `
          </span>
          <span style="font-size: 7px;color: #a6e0b0" class="resource-timer" data-production="` + resources.deuter.production + `" data-inital="` + resources.deuter.value + `" data-date="` + resources.updateAt + `">
          	` + (resources ? YourFrogResourceAmountFormat(resources.deuter.value) : '?')  + `
          </span>
        </div>
      `
    }
  }
  
	// Dodanie informacji o misji
	$('#other-planets .planet-item .planet-coords:contains("' + cords + '")').append(`
  <div>
  	` + energyIconContent + `
  	` + fieldsIconContent + `
  	` + warningContent + `
  	<span style="color: ` + colors.metal + (colors.metal == "gold" ? ';font-weight: bold;' : '') + `">` + levels.metal + (isMetalUpgrade ? " -> " + upgrade.buildingData.toLevel : "" ) + `</span>
  	<span style="color: ` + colors.crystal + (colors.crystal == "gold" ? ';font-weight: bold;' : '') + `">` + levels.crystal + (isCrystalUpgrade ? " -> " + upgrade.buildingData.toLevel : "" )  + `</span>
  	<span style="color: ` + colors.deuter + (colors.deuter == "gold" ? ';font-weight: bold;' : '') + `">` + levels.deuter + (isDeuterUpgrade ? " -> " + upgrade.buildingData.toLevel : "" )  + `</span>
    ` + constructionContent + `
  </div>
  ` + contentOfResource + `
	`)
  
  drawPlanetActivities(cords)
  
  unsafeWindow.ConfigureTooltips();
}

function drawPlanetActivities(cords)
{
  let planet = planets[cords]
  
  let now = (new Date()).getTime()
  let leftMinutes = parseInt((now - planet.last_activity) / 60_000)
 
  let container = $('#other-planets .planet-item span.planet-coords:contains("' + cords + '")').parent().parent()
  
  let color = "red"
  let tooltip = ''
  
  switch(true) {
    case typeof planet.last_activity == 'undefined': 
      	color = 'silver'; 
      break;  
    case now - planet.last_activity >= 60 * 60_000: 
      	color = 'red'; 
      break;
    case now - planet.last_activity < 5 * 60_000: 
      	color = 'green'; 
      break;
    case now - planet.last_activity < 60 * 60_000: 
      	color = 'yellow'; 
	      tooltip = `class="tooltip" data-tooltip-position="bottom" data-tooltip-content="<span style='font-size: 8px;'>` + leftMinutes + ` minutes ago</span>"`;
      break;
  }
  
  // Dodanie informacji o aktynwości na planecie
  $(container).css('position', 'relative')
  $(container).append(`
    <div style="position: absolute; right: -5px; top: -5px;background-color: ` + color + `; border-radius: 25px;font-size: 10px; width: 10px;height: 10px;display:grid; text-align: center;align-items: center; color: white;font-weight: bold;"  ` + tooltip + `>
    
    </div>
  `)
}


function YourFrogResourceAmountFormat(value) {
  let number
  let sufix
  
  if (value > 1_000) {
    	number = value / 1_000
      sufix = "K" 
  }
  
  if (value > 1_000_000) {
    	number = value / 1_000_000
      sufix = "KK" 
  }
  
  if (value > 1_000_000_000) {
    	number = value / 1_000_000_000
      sufix = "KKK" 
  }
  
  if (value > 1_000_000_000_000) {
    	number = value / 1_000_000_000_000
      sufix = "KKKK" 
  }
  
  let fixed = number.toFixed(2).replace(/\.0+$/,'')
  
  if (!fixed.includes('.')) {
    fixed += ".00"
  }
  
  return fixed + " " + sufix
//   return (Math.floor(number * 100) / 100).toFixed(2).replace(/\.0+$/,'') + " " + sufix
}

function YourFrogTiming(resources) {
	function formatTime(seconds) {
    
		if (seconds == 0) { return "---"; }
		
		return new Date(seconds * 1000).toISOString().substring(11, 16)
	}

	function caluclate(require, have, production) {
    let needResource = calculateNeedResource(require, have)
        
		if (needResource == 0) { return 0; }
		
		return needResource / production
	}
  
  function calculateNeedResource(require, have) { 
    if (require < have) { return 0; }
    
    return parseInt(require - have)
  }
  
  let message = "";
	
	let items = [
		{id: "detail-METAL_MINE", name: "Kopalnia metalu"}, 
		{id: "detail-CRYSTAL_MINE", name: "Kopalnia kryształu"}, 
		{id: "detail-DEUTERIUM_REFINERY", name: "Ekstraktor deuteru"},

    // Badania
    {id: "detail-SPY_TECHNOLOGY", name: "detail-SPY_TECHNOLOGY"}, 
    {id: "detail-COMPUTER_TECHNOLOGY", name: "detail-COMPUTER_TECHNOLOGY"}, 
    {id: "detail-ENERGY_TECHNOLOGY", name: "detail-ENERGY_TECHNOLOGY"},
    {id: "detail-LASER_TECHNOLOGY", name: "detail-LASER_TECHNOLOGY"},
    {id: "detail-ION_TECHNOLOGY", name: "detail-ION_TECHNOLOGY"}, 
    {id: "detail-PLASMA_TECHNOLOGY", name: "detail-PLASMA_TECHNOLOGY"},
    {id: "detail-GRAVITON_RESEARCH", name: "detail-GRAVITON_RESEARCH"},
    {id: "detail-WEAPONS_TECHNOLOGY", name: "detail-WEAPONS_TECHNOLOGY"}, 
    {id: "detail-SHIELD_TECHNOLOGY", name: "detail-SHIELD_TECHNOLOGY"},
    {id: "detail-ARMOUR_TECHNOLOGY", name: "detail-ARMOUR_TECHNOLOGY"}, 
    {id: "detail-HYPERSPACE_TECHNOLOGY", name: "detail-HYPERSPACE_TECHNOLOGY"},
    {id: "detail-COMBUSTION_ENGINE", name: "detail-COMBUSTION_ENGINE"},
    {id: "detail-IMPULSE_ENGINE", name: "detail-IMPULSE_ENGINE"},
    {id: "detail-HYPERSPACE_ENGINE", name: "detail-HYPERSPACE_ENGINE"},
    {id: "detail-CARGO_TECHNOLOGY", name: "detail-CARGO_TECHNOLOGY"},
    {id: "detail-ASTROPHYSICS", name: "detail-ASTROPHYSICS"},
    {id: "detail-INTERGALACTIC_RESEARCH", name: "detail-INTERGALACTIC_RESEARCH"},
    {id: "detail-MINERAL_TECHNOLOGY", name: "detail-MINERAL_TECHNOLOGY"},
    {id: "detail-CRYSTALLIZATION_TECNOLOGY", name: "detail-CRYSTALLIZATION_TECNOLOGY"},
    {id: "detail-FUEL_TECHNOLOGY", name: "detail-FUEL_TECHNOLOGY"},
    
    {id: "detail-SOLAR_SATELLITE", name: "detail-SOLAR_SATELLITE"},
    {id: "detail-CRAWLER", name: "detail-CRAWLER"},
    {id: "detail-SPY_PROBE", name: "detail-SPY_PROBE"},
    {id: "detail-LIGHT_CARGO", name: "detail-LIGHT_CARGO"},
    {id: "detail-HEAVY_CARGO", name: "detail-HEAVY_CARGO"},
    {id: "detail-RECYCLER", name: "detail-RECYCLER"},
    {id: "detail-COLONY_SHIP", name: "detail-COLONY_SHIP"},
    {id: "detail-ASTEROID_MINER", name: "detail-ASTEROID_MINER"},
    {id: "detail-LIGHT_FIGHTER", name: "detail-LIGHT_FIGHTER"},
    {id: "detail-HEAVY_FIGHTER", name: "detail-HEAVY_FIGHTER"},
    {id: "detail-CRUISER", name: "detail-CRUISER"},
    {id: "detail-BATTLESHIP", name: "detail-BATTLESHIP"},
    {id: "detail-BATTLE_CRUISER", name: "detail-BATTLE_CRUISER"},
    {id: "detail-PLANET_BOMBER", name: "detail-PLANET_BOMBER"},
    {id: "detail-DESTROYER", name: "detail-DESTROYER"},
    {id: "detail-REAPER", name: "detail-REAPER"},
    {id: "detail-GALLEON", name: "detail-GALLEON"},
    {id: "detail-DEATH_STAR", name: "detail-DEATH_STAR"},
    {id: "detail-FALCON", name: "detail-FALCON"},
    {id: "detail-AVATAR", name: "detail-AVATAR"},


    {id: "detail-MISSILE_LAUNCHER", name: "detail-MISSILE_LAUNCHER"},
    {id: "detail-LIGHT_LASER_TURRET", name: "detail-LIGHT_LASER_TURRET"},
    {id: "detail-HEAVY_LASER_TURRET", name: "detail-HEAVY_LASER_TURRET"},
    {id: "detail-ION_CANNON", name: "detail-ION_CANNON"}, 
    {id: "detail-GAUSS_CANNON", name: "detail-GAUSS_CANNON"},
    {id: "detail-PLASMA_CANNON", name: "detail-PLASMA_CANNON"},
    {id: "detail-DORA_GUN", name: "detail-DORA_GUN"},
    {id: "detail-PHOTON_CANNON", name: "detail-PHOTON_CANNON"},
    {id: "detail-SMALL_SHIELD_DOME", name: "detail-SMALL_SHIELD_DOME"},
    {id: "detail-LARGE_SHIELD_DOME", name: "detail-LARGE_SHIELD_DOME"},
    {id: "detail-ATMOSPHERIC_SHIELD", name: "detail-ATMOSPHERIC_SHIELD"},
    {id: "detail-FORTRESS", name: "detail-FORTRESS"},
    {id: "detail-DOOM_CANNON", name: "detail-DOOM_CANNON"},
    {id: "detail-ORBITAL_DEFENSE_PLATFORM", name: "detail-ORBITAL_DEFENSE_PLATFORM"},
    {id: "detail-INTERCEPTOR", name: "detail-INTERCEPTOR"},
    {id: "detail-INTERPLANETARY_MISSILE", name: "detail-INTERPLANETARY_MISSILE"},

    {id: "detail-ROBOT_FACTORY", name: "detail-ROBOT_FACTORY"},
    {id: "detail-NANITE_FACTORY", name: "detail-NANITE_FACTORY"},
    {id: "detail-SHIPYARD", name: "detail-SHIPYARD"},
    {id: "detail-RESEARCH_LAB", name: "detail-RESEARCH_LAB"},
    {id: "detail-UNIVERSITY", name: "detail-UNIVERSITY"},
    {id: "detail-TERRAFORMER", name: "detail-TERRAFORMER"},
    {id: "detail-MISSILE_SILO", name: "detail-MISSILE_SILO"},
	].forEach((element) => {

		requireResource = {
		  metal: $('div#' + element.id + ' span.resource-amount').eq(0).text().replaceAll(".", ""),
		  crystal: requireCrystal = $('div#' + element.id + ' span.resource-amount').eq(1).text().replaceAll(".", ""),
		  deuter: requireCrystal = $('div#' + element.id + ' span.resource-amount').eq(2).text().replaceAll(".", ""),
		}

		timeLeft = {
		  metal: caluclate(requireResource.metal, resources.initialMetal, resources.metalProduction),
		  crystal: caluclate(requireResource.crystal, resources.initialCrystal, resources.crystalProduction),
		  deuter: caluclate(requireResource.deuter, resources.initialDeuterium, resources.deuteriumProduction)
		}
    
    let needMetal = calculateNeedResource(requireResource.metal, resources.initialMetal)
    let needCrystal = calculateNeedResource(requireResource.crystal, resources.initialCrystal)
    let needDeuter = calculateNeedResource(requireResource.deuter, resources.initialDeuterium)

		let lineText = "Potrzebny czas: " + formatTime(Math.max(timeLeft.metal, timeLeft.crystal)) + ", metal: " + formatTime(timeLeft.metal) + ", crystal: " + formatTime(timeLeft.crystal) + " \r\n"
		let needText = "Brakuje, Metal: " + needMetal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ", Kryształ: " + needCrystal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ", Deuter: " + needDeuter.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        
    $('div#' + element.id + ' .top-section').css('height', '190px');
    $('div#' + element.id + ' .required-section').append(`
    	<div class="required-resource-item">
      	<span class="resource-icon"></span> 
      	<span class="resource-amount">
	        <a href="#" class="btn-help yourfrog-distribute-save" data-metal="` + needMetal + `" data-crystal="` + needCrystal + `" data-deuter="` + needDeuter + `" id="" > Save to Distribute</a>
        </span> 
      </div>
    `);
		$('div#' + element.id + ' .required-section').append('<div class="required-resource-item"><span class="resource-icon"></span><span class="resource-amount" style="color:yellow;">' + lineText + '</span></div>');
		$('div#' + element.id + ' .required-section').append('<div class="required-resource-item"><span class="resource-icon"></span><span class="resource-amount" style="color:yellow;">' + needText + '</span></div>');
	})
  
}

async function runScript_Empire() {
	console.log("Resource::runScript_Empire")
  
  let planets = {}
  
  // Read planet information
  $('.planetViewContainer > div:eq(0) .col:not(.header):not(:first)').each(function(index) {
    let columnIndex = 2 + index
    let data = {
        coordinate: $('.planet-coords', this).text(), //.clearCoordinate(),
        energy: $('.planet-energy-value', this).text().toInteger(),
      	fields: {
          current: $('.planet-fields', this).text().split('/')[0].toInteger(),
          max: $('.planet-fields', this).text().split('/')[1].toInteger()
        },
        resource: {
          metal: $('.planetViewContainer .prop-row:eq(0) .col:eq(' + columnIndex + ') .cell-value:eq(0)').text().toInteger(),
          crystal: $('.planetViewContainer .prop-row:eq(0) .col:eq(' + columnIndex + ') .cell-value:eq(1)').text().toInteger(),
          deuter: $('.planetViewContainer .prop-row:eq(0) .col:eq(' + columnIndex + ') .cell-value:eq(2)').text().toInteger(),
        },
        production: {
          metal: $('.planetViewContainer .prop-row:eq(1) .col:eq(' + columnIndex + ') .cell-value:eq(0)').text().toInteger(),
          crystal: $('.planetViewContainer .prop-row:eq(1) .col:eq(' + columnIndex + ') .cell-value:eq(1)').text().toInteger(),
          deuter: $('.planetViewContainer .prop-row:eq(1) .col:eq(' + columnIndex + ') .cell-value:eq(2)').text().toInteger(),
        },
        storage: {
          metal: $('.planetViewContainer .prop-row:eq(3) .col:eq(' + columnIndex + ') .cell-value:eq(5)').text().toInteger(),
          crystal: $('.planetViewContainer .prop-row:eq(3) .col:eq(' + columnIndex + ') .cell-value:eq(6)').text().toInteger(),
          deuter: $('.planetViewContainer .prop-row:eq(3) .col:eq(' + columnIndex + ') .cell-value:eq(7)').text().toInteger(),
        },
        buildings: {
					metalMine: $('.planetViewContainer .prop-row:eq(3) .col:eq(' + columnIndex + ') .cell-value:eq(0)').text().toInteger(),
          crystalMine: $('.planetViewContainer .prop-row:eq(3) .col:eq(' + columnIndex + ') .cell-value:eq(1)').text().toInteger(),
          deuteriumRefinery: $('.planetViewContainer .prop-row:eq(3) .col:eq(' + columnIndex + ') .cell-value:eq(2)').text().toInteger(),
        }
    }

    planets[data.coordinate] = data
  })
  
  empire = {
    updateAt: (new Date()).getTime(),
    planets: planets,
    all: {
      resource: {
      	metal: $('.planetViewContainer .prop-row:eq(0) .col:eq(1) .cell-value:eq(0)').text().toInteger(),
      	crystal: $('.planetViewContainer .prop-row:eq(0) .col:eq(1) .cell-value:eq(1)').text().toInteger(),
      	deuter: $('.planetViewContainer .prop-row:eq(0) .col:eq(1) .cell-value:eq(2)').text().toInteger(),
      },
      production: {
      	metal: $('.planetViewContainer .prop-row:eq(1) .col:eq(1) .cell-value:eq(0)').text().toInteger(),
      	crystal: $('.planetViewContainer .prop-row:eq(1) .col:eq(1) .cell-value:eq(1)').text().toInteger(),
      	deuter: $('.planetViewContainer .prop-row:eq(1) .col:eq(1) .cell-value:eq(2)').text().toInteger(),
      },
    },
    research: {}
  }
  
  empire_save()
}


function secondsToReadable(value) {
  let hours = Math.floor(value / 3600);
	let totalSeconds = value % 3600;
	let minutes = Math.floor(totalSeconds / 60);
	let seconds = totalSeconds % 60;
  
  return hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0') + ":" + seconds.toString().padStart(2, '0')
}

Object.assign(String.prototype, {
  clearCoordinate() {
    return this.replaceAll('[', '').replaceAll(']', '')
  },
  
  toInteger() {
    let normalize = this.replaceAll('.', '')
    
  	return parseInt(normalize)
	}
})

$(document).ready(function() {
  (async() => {
    runScript()
  })()
});