// ==UserScript==
// @name     YourFrog - OGameX - Galaxy
// @version  1
// @include  *https://hyper.ogamex.net/galaxy*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @grant           GM.setValue
// @grant           GM.getValue
// @grant    GM.setClipboard
// ==/UserScript==


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
  let serialize = await GM.getValue('galaxy', '{}');
  let obj = JSON.parse(serialize)
  
  for(index in planets) {
    let item = planets[index]
    
  	obj[item.cords] = item
  }
  
  let serializeObj = JSON.stringify(obj);
  await GM.setValue('galaxy', serializeObj);
}

async function exportGalaxy() {
    let serialize = await GM.getValue('galaxy', '{}');
    let obj = JSON.parse(serialize)
    
    let result = "Galaktyka;System;Układ;Planeta;Gracz;Sojusz;Data od aktualizacji (od: " + (new Date()).toISOString() + "\n"
    
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
      
     	result += split[0] + ";" + split[1] + ";" + split[2] + ";" + item.planet_name + ";" + item.player_name + ";" + item.alliance + ";" + ((new Date()).getTime() - item.update_time) + "\n" 
    }
    
  GM.setClipboard(result);
  alert('Skopiowano')
}

$(document).ready(function() {

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
    
    if (scanerHandler == null) {
      scanerHandler = setInterval(function() {
        let system = $('#systemInput').val()

        if (system < 499) {
          $('#btnSystemRight')[0].click();
        }
      }, 500)
    } else {
     clearInterval(scanerHandler); 
      scanerHandler = null
    }
    
    event.preventDefault()
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
  
  setInterval(function() {
    console.log('scan...')
    
    let planets = []
    
    $('#galaxyContent .galaxy-item').each(function() {
      let isHead = $(this).hasClass('galaxy-item-head')
      if (isHead) { return }
      
			let position = $('.planet-index', this).text()
      if (position >= 16) { return }

	
      let now = new Date()
      let item = {}

      item.cords = $('#galaxyInput').val() + ":" + $('#systemInput').val() + ":" + $('.planet-index', this).text()
      item.planet_name = $('.col-planet-name', this).text().replaceAll("\n", "").trim()
      item.alliance = $('.col-alliance', this).text().replaceAll("\n", "").trim()
      item.player_name = $('.col-player > a > span', this).eq(0).text().replaceAll("\n", "").trim()
      item.hasMoon = $('.col-moon > div', this).length == 1,
      item.update_time = now.getTime()

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
      
      let isHighlights = false
      
      if (settings.galaxy.highlights.debris.metal < debris.metal) { isHighlights = true }
      if (settings.galaxy.highlights.debris.crystal < debris.crystal) { isHighlights = true }
      if (settings.galaxy.highlights.debris.all < debris.metal + debris.crystal) { isHighlights = true }
      
      if (isHighlights) {
      	$(tooltipDiv).parent().css('background-color', settings.colors.highlights)
      }
    })
    

    savePlanetsData(planets)
    
  }, 100)
})