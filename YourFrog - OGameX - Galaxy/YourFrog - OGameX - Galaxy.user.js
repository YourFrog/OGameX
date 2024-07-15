// ==UserScript==
// @name     YourFrog - OGameX - Galaxy
// @version  1
// @include  *https://hyper.ogamex.net/galaxy*
// @include  *https://hyper.ogamex.net/messages*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @grant           GM.setValue
// @grant           GM.getValue
// @grant    GM.setClipboard
// ==/UserScript==

let dataOfGalaxy = {}
let asteroids = {}

const settings = {
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
     	minimum_ranking: 1800 
    }
  },
  colors: {
  	metal: "#ffaacca1",
    crystal: "#73e5ffc7",
    highlights: "gold"
  }
}

let scanerHandler = null;

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

  console.log("asteroids", asteroids)
  
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
    
    if (scanerHandler == null) {
      scanerHandler = setInterval(function() {
        let hasAsteroid = systemHasAsteroid()
        let isLoader = $('#BackGroundFreezerPreloader_Element').length == 1
        
        if (isLoader) { 
          return false; 
        }
        
        if (hasAsteroid) {
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
        
        alert("Gracz oznaczony jako słaba farma")
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
        
        alert("Gracz oznaczony jako słaba farma")
      })()
    	
  })
  
  let isGalaxyPage = location.pathname == "/galaxy"
  let isMessagePage = location.pathname == "/messages"
  
  if (isGalaxyPage) {
    setInterval(function() {
      utils_UpdateGalaxySystem()
    }, 100)  
  }
  
	if (isMessagePage) {        
    setInterval(function() {
      (async() => {
        utils_UpdateCombatMessages()
      })()
    }, 1000)
  }
}

$(document).ready(function() {
  (async() => {
    let serialize = await GM.getValue('galaxy', '{}');
    dataOfGalaxy = JSON.parse(serialize)
    
    runScript()
  })()
});

async function utils_UpdateCombatMessages() {
  console.log('utils_UpdateCombatMessages')
  
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
    		<a href="#" class="item-low-farm" data-galaxy="` + split[0] + `" data-system="` + split[1] + `" data-position="` + split[2] + `" style="color: lime">Oznacz jako dobra farma</a>
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
  
    console.log('scan...')
    
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
      let item = dataOfGalaxy[cords] ? dataOfGalaxy[cords] : {
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
    
    let hasTimer = lastAttackInSeconds > 0 && lastAttackInSeconds < 60 * 60
    let isUnmark = (typeof item.isLowFarm == "undefined")
    let isMark = !isUnmark
    let hasDebris = item.debris.metal != 0 || item.debris.crystal != 0
        
    switch(true) {
      case hasDebris: highlight = "pink"; break;
        
      // Nie oznaczony i posiada timer 
      case isUnmark && hasTimer: highlight = 'orange'; break; 
        
      // Nie oznaczony i nie posiada timera
      case isUnmark && !hasTimer: highlight = 'lime'; break; 
        
      // Oznaczony jako słaba farma
      case isMark && item.isLowFarm === true: highlight = 'red'; break;
        
      // Oznaczony jako dobra farma i nie posiada timer'a
      case isMark && item.isLowFarm === false && !hasTimer: highlight = 'gold'; break;
        
      // Oznaczony jako dobra farma i posiada timer'a
      case isMark && item.isLowFarm === false && hasTimer: highlight = 'orange'; break;
    }
    
    content += `
    	<li>
            <a href="fleet?x=` + item.galaxy + `&y=` + item.system + `&z=` + item.position + `&planet=1&mission=8" class="attack-item" data-galaxy="` + item.galaxy + `" data-system="` + item.system + `" data-position="` + item.position + `">
            	<span style="font-size: 8px; color: ` + highlight + `">
              	` + item.ranking + ` - ` + item.cords + ` ` + (lastAttackInSeconds > 0 && lastAttackInSeconds < 60 * 60 ? '- last attack: ' + secondsToReadable(lastAttackInSeconds) : '') + `
                </span>
            </a>
            
            <a href="#" class="btnActionSpy tooltip" onclick="SendSpy(1,144,6 ,1,false); return false;" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Spy</div>" style="font-size: 7px; color: white;">Szpieguj</a>
            <a href="https://hyper.ogamex.net/galaxy?x=` + item.galaxy + `&y=` + item.system + `" style="font-size: 7px; color: white;">Galaktyka</a>
            
            </li>
    `
  }
  
  $('#yourfrog-idlers').remove()
  $('#galaxy-container').append(`
  	<div id="yourfrog-idlers" style="padding: 20px;">
    	<h5>Idlers</h5>
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
    
    content += `
          <li>            
            <a href="fleet?x=` + item.galaxy + `&y=` + item.system + `&z=17&planet=1&mission=12" class="asteroid-item" data-galaxy="` + item.galaxy + `" data-system="` + item.system + `">
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
