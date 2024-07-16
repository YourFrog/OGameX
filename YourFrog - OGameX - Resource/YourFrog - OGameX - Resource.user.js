// ==UserScript==
// @name     YourFrog - OGameX - Resource
// @version  1
// @include  *hyper.ogamex.net/home*
// @include  *hyper.ogamex.net/messages*
// @include  *hyper.ogamex.net/hangar*
// @include  *hyper.ogamex.net/defense*
// @include  *hyper.ogamex.net/research*
// @include  *hyper.ogamex.net/building/facility*
// @include  *hyper.ogamex.net/building/resource*
// @include  *https://hyper.ogamex.net/fleet/distributeresources*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @grant           GM.setValue
// @grant           GM.getValue
// ==/UserScript==

let planets = {}

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
 *	Uruchomienie skryptu
 */
async function runScript() {
  let isHomePage = location.pathname == "/home"
  let isResourcePage = location.pathname == "/building/resource"
  
	let jsonSerialize = await GM.getValue('planets', '{}');
  planets = JSON.parse(jsonSerialize)
  
  updateResourceInformation()
  
  if (isHomePage) {
		runScript_Home()
  }
  
  if (isResourcePage) {
   	runScript_Resource() 
  }
  
  console.log("YourFrog - Run 1");
	YourFrogTiming(unsafeWindow.resources);
  console.log("YourFrog - Finish");
  
  
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
        alert("zapisano!")
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
        let serialize = await GM.getValue('distribute-save');
        let obj = JSON.parse(serialize)
        
	    	$('span:contains("Heavy Cargo")').trigger("click");
        
        unsafeWindow.AutoNumeric.getAutoNumericElement('#resource-input-metal').set(obj.metal);
        unsafeWindow.AutoNumeric.getAutoNumericElement('#resource-input-crystal').set(obj.crystal);
        unsafeWindow.AutoNumeric.getAutoNumericElement('#resource-input-deuterium').set(obj.deuter);
        
        $('#distribute-resources-container .right-side span:contains("' + obj.cords + '")').eq(0).trigger("click")
        
        setTimeout(() => {
	        $('#distribute-resources-container .right-side #btnSend')[0].click();
        }, 500);
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
  
  console.log("Minimum before: ", minimum)
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
  
  console.log("Minimum after: ", minimum)
  
  for(cords in obj) {
    let data = obj[cords]
		let upgrade = extractUpgradeInformation()[cords]
    
    if (typeof upgrade === 'undefined' || typeof upgrade.isBuildingUpgrade === 'undefined') { return }
    
    let isMetalUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Metal Mine'
    let isCrystalUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Crystal Mine'
    let isDeuterUpgrade = upgrade.isBuildingUpgrade && upgrade.buildingData.name == 'Deuterium Refinery'

    // Jeżeli mamy wyświetlić warning to upewnijmy się że żadna kopalnia nie jest budowana
    let showWarning = data.showWarning ? !(isMetalUpgrade || isCrystalUpgrade || isDeuterUpgrade) : false
    
    YourFrogAddMineLevelsToPlanet(showWarning, cords, data.levels, data.resources, minimum, data.construction)
  }  
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
  
  if (showWarning) {
   	warningContent = `
    	<i class="fas fa-exclamation-triangle" style="color: #CCC;padding: 2px 5px;border-radius: 3px;color: orange"></i>
    `
  } else {
    if (typeof construction  !== "undefined") {
      console.log("construction", construction)
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
  	` + warningContent + `
  	<span style="color: ` + colors.metal + (colors.metal == "gold" ? ';font-weight: bold;' : '') + `">` + levels.metal + (isMetalUpgrade ? " -> " + upgrade.buildingData.toLevel : "" ) + `</span>
  	<span style="color: ` + colors.crystal + (colors.crystal == "gold" ? ';font-weight: bold;' : '') + `">` + levels.crystal + (isCrystalUpgrade ? " -> " + upgrade.buildingData.toLevel : "" )  + `</span>
  	<span style="color: ` + colors.deuter + (colors.deuter == "gold" ? ';font-weight: bold;' : '') + `">` + levels.deuter + (isDeuterUpgrade ? " -> " + upgrade.buildingData.toLevel : "" )  + `</span>
    ` + constructionContent + `
  </div>
  ` + contentOfResource + `
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

function secondsToReadable(value) {
  let hours = Math.floor(value / 3600);
	let totalSeconds = value % 3600;
	let minutes = Math.floor(totalSeconds / 60);
	let seconds = totalSeconds % 60;
  
  return hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0') + ":" + seconds.toString().padStart(2, '0')
}

$(document).ready(function() {
  (async() => {
    runScript()
  })()
});