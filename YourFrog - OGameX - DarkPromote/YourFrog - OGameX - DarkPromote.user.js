// ==UserScript==
// @name     YourFrog - OGameX - DarkPromote
// @version  1
// @include  *hyper.ogamex.net/darkmatter/promote*
// @include  *hyper.ogamex.net/*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @grant           GM.setValue
// @grant           GM.getValue
// ==/UserScript==


const settings = {
	promote: {
    // Od jakiej ilości sekund guzik będzie widoczny
   	visibleFrom: 30 * 60 
  }
}

let dateOfPromoteLinks = {}

$(document).ready(function() {
  console.log('Run DarkPromote');
  
  (async() => {
		let jsonSerialize = await GM.getValue('promote-links', '{}');
  	dateOfPromoteLinks = JSON.parse(jsonSerialize)
    
    runScript()

    let serializeObj = JSON.stringify(dateOfPromoteLinks);
    await GM.setValue('promote-links', serializeObj);
  })()
});


async function runScript() {
  let isPromotePage = location.pathname == "/darkmatter/promote"

  if (isPromotePage) {
    runScript_PromotePage()
  }
  
  if (typeof dateOfPromoteLinks.left === 'undefined' || typeof dateOfPromoteLinks.updateAt === 'undefined') { return }
    
    
  let now = (new Date()).getTime()
  let leftInSeconds = dateOfPromoteLinks.left - (now - dateOfPromoteLinks.updateAt) / 1000 
  
  let isVisible = false
  let label = ''
 
  switch(true) {
    case leftInSeconds < settings.promote.visibleFrom: 
      	label = "Promote: " + unsafeWindow.ConvertToTimeString(leftInSeconds)
	      isVisible = true    
      break;
    case leftInSeconds <= 0:
	      label = "Take promote"
	      isVisible = true    
      break;
    default:
      isVisible = false
  }
  
  if (isVisible) {
    $('#left-menu-1').prepend(`
      <div class="menu-item btn-online-bonus">
        <a href="/darkmatter/promote" class="text-item" style="font-size: 8px" >` + label + `</a>
      </div>
    `)
  }
}

async function runScript_PromotePage() {
  let timers = $('.x-vote-time').map(function() {
    return $(this).data('remaining-time');
  })

  let minimumTimers = Math.min(...timers)
  
  dateOfPromoteLinks = {
    left: minimumTimers,
   	updateAt: (new Date()).getTime()
  }
}