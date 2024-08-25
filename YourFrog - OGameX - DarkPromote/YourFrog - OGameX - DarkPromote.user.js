// ==UserScript==
// @name     YourFrog - OGameX - DarkPromote
// @version  1
// @include  *hyper.ogamex.net/*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @require https://github.com/YourFrog/OGameX/raw/main/YourFrog%20-%20OGameX%20-%20Communicate/YourFrog%20-%20OGameX%20-%20Communicate.user.js
// @grant           GM.setValue
// @grant           GM.getValue
// ==/UserScript==


const settings = {
	promote: {
    // Od jakiej ilości sekund guzik będzie widoczny
   	visibleFrom: 30 * 60 
  }
}

let data = {}

$(document).ready(function() {
  
  (async() => {
  	console.log('Run DarkPromote');
		let jsonSerialize = await GM.getValue('data', '{"promoteLinks": {}, "importExport": {}}');
  	data = JSON.parse(jsonSerialize)
    
    runScript()

    let serializeObj = JSON.stringify(data);
    await GM.setValue('data', serializeObj);
  })()
});


async function runScript() {
  let isPromotePage = location.pathname == "/darkmatter/promote"
	let isImportExportPage = location.pathname == "/merchant/importexport"

  if (isPromotePage) {
    runScript_PromotePage()
  }
  
  
  if (isImportExportPage) {
    runScript_ImportExportPage()
  }
  
  addPromoteIfNeeded()
  addImportExportIfNeeded()
}

async function runScript_PromotePage() {
  let timers = $('.x-vote-time').map(function() {
    return $(this).data('remaining-time');
  })

  let minimumTimers = Math.min(...timers)
  
  data.promoteLinks = {
    left: minimumTimers,
   	updateAt: (new Date()).getTime()
  }
}

async function runScript_ImportExportPage() {
  data.importExport = {
    left: unsafeWindow.remainingSecondsToNextContainer,
    isPurchased: unsafeWindow.isPurchased,
   	updateAt: (new Date()).getTime()
  }
}

function addImportExportIfNeeded() {
  let item = data.importExport
  
  let now = (new Date()).getTime()
  let leftInSeconds = item.left - (now - item.updateAt) / 1000
  
  let isVisible
  
 
  Logger.add("Import/Export left " + unsafeWindow.ConvertToTimeString(leftInSeconds), 5_000)
  switch(true) {
    case item.isPurchased && leftInSeconds > 0: isVisible = false; break;
    case item.isPurchased && leftInSeconds < 0: isVisible = true; break;
    case !item.isPurchased: isVisible = true; break;
      
  }
  
  if (isVisible) {
  	addButton('Import / Export', '/merchant/importexport')  
  }
}


function addPromoteIfNeeded() {
  let item = data.promoteLinks
  
  if (typeof item.left === 'undefined' || typeof item.updateAt === 'undefined') { return }
    
  let now = (new Date()).getTime()
  let leftInSeconds = item.left - (now - item.updateAt) / 1000 
  
  let isVisible = false
  let label = ''
 
  Logger.add("Dark promote left " + unsafeWindow.ConvertToTimeString(leftInSeconds), 5_000)
  switch(true) {
    case leftInSeconds < settings.promote.visibleFrom: 
      	label = "Promote: " + unsafeWindow.ConvertToTimeString(leftInSeconds)
	      isVisible = true    
      break;
    case leftInSeconds <= 0:
	      label = "Take Promote"
	      isVisible = true    
      break;
    default:
      isVisible = false
  }
  
  if (isVisible) {
    addButton(label, '/darkmatter/promote')
  }
}
  
function addButton(label, pathname) {
  $('#left-menu-1').prepend(`
      <div class="menu-item btn-online-bonus">
        <a href="` + pathname + `" class="text-item" style="font-size: 8px" >` + label + `</a>
      </div>
	`)
}