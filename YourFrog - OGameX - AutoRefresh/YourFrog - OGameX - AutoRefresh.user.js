// ==UserScript==
// @name     YourFrog - OGameX - AutoRefresh
// @version  1
// @include  *https://hyper.ogamex.net/*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @grant           GM.setValue
// @grant           GM.getValue
// @grant    GM.setClipboard
// ==/UserScript==

var settings = {
  delay: {
   	planet: {
  		// Minimum seconds for refresh planet (seconds)
     	min: 10 * 60,
      
  		// Maximum seconds for refresh planet (seconds)
      max: 13 * 60
    },
    moon: {
  		// Minimum seconds for refresh moon (seconds)
     	min: 5 * 60,
      
  		// Maximum seconds for refresh moon (seconds)
      max: 5 * 60
    }
  },
  
  // List of planets for ignore
  ignorePlanets: [
    
    // possible type:
    //  * planet, 
    //  * moon
    //  * all - Ignore both planet or moon
    //
    // Sample: 
    //  {coordinate: '1:145:9', type: 'planet'},
    //  {coordinate: '1:346:9', type: 'all'}, 
    
    {coordinate: '1:346:9', type: 'all'}
  ]
  
}

var global = {
	planets: []  
}

var isEnable = true
var handler = null

$(document).ready(function() {
  console.log('Run, AutoRefresh');
  
	(async() => {
    runScript()
  })()
})

/**
 *	Uruchomienie skryptu
 */
async function runScript() {
  isEnable = await GM.getValue('settings.enable', false);

  $('#left-menu-1').prepend(`
      <div class="menu-item">
        <a href="#" class="text-item" style="font-size: 8px;" id="yourfrog-refresh">` + (isEnable ? '---' : 'Refresh: Disable') + `</a>
      </div>
  `)
  
  $(document).on('click', '#yourfrog-refresh', function() {  
    (async() => {
      isEnable = !isEnable;
      await GM.setValue('settings.enable', isEnable);

      if (isEnable) {
        startTimer() 
      } else {
        clearInterval(handler)
        handler = null
        
        $('#yourfrog-refresh').text('Refresh: Disable').css('color', '')
      }
    })()
  })
  
  startTimer()
}
    
async function startTimer() {  
  let now = (new Date()).getTime()
  
  global.planets = await getAllPlanetsAndMoons()
  let currentItem = getCurrentPlanerOrMoon()
  
 	global.planets[currentItem.coordinate + "-" + currentItem.type].updateAt = now
  
  let minimum = null
  for (index in global.planets) {
    let item = global.planets[index]
  	item.left = parseInt(item.delay - ((now - item.updateAt) / 1000))
    
    
    if (isIgnorePlanet(item)) { 
      console.log('ignore planet', item)
      continue 
    }

    if (minimum == null || minimum.left > item.left) {
     	minimum = item 
    }
  }
  
  $('#yourfrog-refresh').attr('data-left', minimum.left)
	savePlanets(global.planets)
  
  if (isEnable) {
    handler = setInterval(() => {
      tick(global.planets, minimum)
    }, 1000)
  }
}
 
/**
 *	Sprawdzenie czy planetę można zignorować
 */
function isIgnorePlanet(planet) {

  for(let index in settings.ignorePlanets) {
    let item = settings.ignorePlanets[index]
    
//     console.log('candidate', item, planet)
    if (item.coordinate != planet.coordinate) { continue; }
    if (item.type != planet.type && item.type != 'all') { continue; }
    
    return true
  }
  
  return false
}


function tick(items, minimum) {
    let element = $('.menu-item > a[data-left]')
    let value = element.data('left') - 1
    
    let label = 'Refresh: ' + unsafeWindow.ConvertToTimeString(value)
    
    $(element).text(label)
    
    if (value < 15) {
			$(element).css('color', 'yellow')
    }
  
    element.data('left', value)
    
    
    if (value <= 0) {
  		let now = (new Date()).getTime()
  
      minimum.updateAt = now
      minimum.delay = calculateDelay(minimum.type)
      
      
      savePlanets(items)
      
      switch(minimum.type) {
        case 'moon': visitMoon(minimum.coordinate); break;
        case 'planet': visitPlanet(minimum.coordinate); break;
      }
      
      return;
    }
}

function calculateDelay(itemType) {
  let range
  
  switch(true) {
    case itemType == 'moon': range = settings.delay.moon;  break;
    case itemType == 'planet': range = settings.delay.planet; break;
  }

  return getRandomInt(range.min, range.max);
}

async function savePlanets(planets) {
  
  let serializeObj = JSON.stringify(planets);
  await GM.setValue('planets', serializeObj);
}

function getCurrentPlanerOrMoon() {
  result = null
  
 	$('.planet-item.selected').each(function() {
    let isMoon = $('.moon-select.selected', this).length == 1
    let type = isMoon ? 'moon' : 'planet'
    let coordinate = $('.planet-coords', this).text().trim().split('[')[1].split(']')[0] 
    
    result = {
      coordinate: coordinate,
     	type: type 
    }
  })
  
  return result
}

/**
 *	Pobranie wszystkich planet oraz księżycy gracza
 */
async function getAllPlanetsAndMoons() {
  let serialize = await GM.getValue('planets', '{}');
  let result = JSON.parse(serialize)
  
  $('#other-planets .planet-item').each(function() { 
    let coordinate = $('.planet-coords', this).text().trim().split('[')[1].split(']')[0] 
    let hasMoon = $('.moon-select', this).length == 1
    
    if (hasMoon) {
      result[coordinate + "-moon"] = result[coordinate + "-moon"] || {
        coordinate: coordinate,
        type: 'moon',
        delay: calculateDelay('moon'),
        updateAt: (new Date()).getTime()
      }
    }
                 
    result[coordinate + "-planet"] = result[coordinate + "-planet"] || {
      delay: calculateDelay('planet'),
     	coordinate: coordinate,
      type: 'planet',
      updateAt: (new Date()).getTime()
    }
  })
  
  return result
}

/**
 *	Kliknięcie planety o podanych współrzędnych (jeżeli taką posiadamy)
 */
function visitPlanet(coordinate) {
  let selector = '.planet-item .planet-coords:contains("' + coordinate + '")'
  let element = $(selector)
  
  if (element.length == 0) {
   	console.log('No planet ', selector) 
  }

  element.parent()[0].click()
}


/**
 *	Kliknięcie księżyca o podanych współrzędnych (jeżeli taką posiadamy)
 */
function visitMoon(coordinate) {
  let selector = '.planet-item .planet-coords:contains("' + coordinate + '")'
  let element = $(selector).parent().parent().find('.moon-select')
  
  if (element.length == 0) {
   	console.log('No moon ', selector, element) 
  }

  element[0].click()
}

function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}


//         let serialize = await GM.getValue('galaxy', '{}');
//         let data = JSON.parse(serialize)


//   				let serializeObj = JSON.stringify(asteroids);
//         	await GM.setValue('asteroids', serializeObj);
