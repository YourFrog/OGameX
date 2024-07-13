// ==UserScript==
// @name     YourFrog - OGameX - Fleet
// @version  1
// @include  *hyper.ogamex.net/*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// ==/UserScript==

function YourFrogAddMissionIconToPlanets(cords, details, color) {
	// Dodanie informacji o misji
	$('#other-planets .planet-item .planet-coords:contains("' + cords + '")').append(`
		<i class="fas fa-space-shuttle tooltip" data-tooltip-position="top" data-tooltip-content="` + details + `" style="font-size: 12px;color: ` + color + `;float: right;margin-left:5px;"></i>
	`)
}

function YourFrogDrawExpedition(items) {
	let filters = items.filter((data) => data.isBack)
	
	if (filters.length == 0) { return }
	
	let content = `
	<div id="yourfrog-expedition" class="fleet-movement-wrapper opened">
		<div class="header">
			<span class="title">Expedition</span>
		</div>
		<div class="content" id="fleet-movement-content">
        <table id="fleet-movement-table" class="fleet-movement-table">
			<tbody>`	
			
	$(filters).each(function(index, data) {
		let sourceMoonContent
		let destinationMoonContent
		
		if (data.source.isMoon) {
			sourceMoonContent = `<img style="width:16px;height:16px;display:inline-block;vertical-align:middle;" class="tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Moon</div>" src="/assets/images/moon-icon.gif?v=2">`
		} else {
			sourceMoonContent = ""
		}
		
		if (data.destination.isMoon) {
			destinationMoonContent = `<img style="width:16px;height:16px;display:inline-block;vertical-align:middle;" class="tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Moon</div>" src="/assets/images/moon-icon.gif?v=2">`
		} else {
			destinationMoonContent = ""
		}
		
		content += `
<tr data-fleet-id="52aa0c9e-203f-4d3c-815d-2a729051ebc0" class="row-mission-type-EXPEDITION row-fleet-return">

	<td data-remaining-seconds="` + data.leftTime + `" class="x-calc-fleet-time col-mission-time tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>11.07.2024 18:49:59</div>">01:14:43</td>
	<td><img src="/assets/images/V2/mission/EXPEDITION.png?v=2" style="cursor:help;" class="tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Expedition</div>"></td>
	<td>
		` + sourceMoonContent + data.source.name + ` <a href="/galaxy?x=1&amp;y=145" class="fleet-source-coords">` + data.source.cords + `</a>
	</td>

	<td><span style="cursor:help;" class="tooltip" data-tooltip-position="bottom" data-tooltip-content="` + data.details +`">` + data.ships + `</span></td>

	<td>
				<a href="#" style="cursor:help;opacity:0.5;" class="tooltip" data-tooltip-position="bottom" data-tooltip-content="` + data.details +`"><img style="width:16px;height:16px;" src="/assets/images/fleet-movement-icon-reverse.gif?v=2"></a>
	</td>

	<td>
		` + destinationMoonContent + `<a href="/galaxy?x=1&amp;y=145&amp;z=4" style="color:#AAA;font-size:11px;text-decoration:none;">` + data.destination.cords + `</a>
		 
	</td>

	<td></td>
</tr>
		`
		
		// Dodanie informacji o misji
		YourFrogAddMissionIconToPlanets(data.source.cords, data.details, 'blue')
	})	

	content += `
				</tbody>					
			</table>
		</div>
	`

	$('div#content-wrapper').prepend(content);
}

function YourFrogDrawTransport(items) {
	let filters = items.filter((data) => !data.isBack)
	
	if (filters.length == 0) { return }
	
	let content = `
	<div id="yourfrog-transport" class="fleet-movement-wrapper opened">
		<div class="header">
			<span class="title">Transport</span>
		</div>
		<div class="content" id="fleet-movement-content">
        <table id="fleet-movement-table" class="fleet-movement-table">
			<tbody>`	
			
	$(filters).each(function(index, data) {
		let sourceMoonContent
		let destinationMoonContent
		
		if (data.source.isMoon) {
			sourceMoonContent = `<img style="width:16px;height:16px;display:inline-block;vertical-align:middle;" class="tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Moon</div>" src="/assets/images/moon-icon.gif?v=2">`
		} else {
			sourceMoonContent = ""
		}
		
		if (data.destination.isMoon) {
			destinationMoonContent = `<img style="width:16px;height:16px;display:inline-block;vertical-align:middle;" class="tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Moon</div>" src="/assets/images/moon-icon.gif?v=2">`
		} else {
			destinationMoonContent = ""
		}
		
		content += `
			<tr data-fleet-id="dceae7c8-d2fd-44a1-8bac-b2fe176872db" class="row-mission-type-TRANSPORT">

				<td data-remaining-seconds="` + data.leftTime + `" class="x-calc-fleet-time col-mission-time tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>11.07.2024 17:23:57</div>">01:32</td>
				<td><img src="/assets/images/V2/mission/TRANSPORT.png?v=2" style="cursor:help;" class="tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Transport</div>"></td>
				<td>

					` + sourceMoonContent + data.source.name + ` <a href="/galaxy?x=1&amp;y=145" class="fleet-source-coords">` + data.source.cords + `</a>
				</td>



				<td><span style="cursor:help;" class="tooltip" data-tooltip-position="bottom" data-tooltip-content="` + data.details +`">` + data.ships + `</span></td>

				<td>
							<a href="#" style="cursor:help;opacity:0.5;" class="tooltip" data-tooltip-position="bottom" data-tooltip-content="` + data.details +`"><img style="width:16px;height:16px;" src="/assets/images/fleet-movement-icon.gif?v=2"></a>
				</td>

				<td>
					` + destinationMoonContent + data.destination.name + ` <a href="/galaxy?x=1&amp;y=145&amp;z=4" style="color:#AAA;font-size:11px;text-decoration:none;">` + data.destination.cords + `</a>
				</td>

				<td></td>
			</tr>
		`

		// Dodanie informacji o misji
		YourFrogAddMissionIconToPlanets(data.destination.cords, data.details, 'green')
	})	

	content += `
				</tbody>					
			</table>
		</div>
	`

	$('div#content-wrapper').prepend(content);
}

function YourFrogDrawAsteroid(items) {
	let filters = items.filter((data) => data.isBack)
	
	if (filters.length == 0) { return }
	
	let content = `
	<div id="yourfrog-miners" class="fleet-movement-wrapper opened">
		<div class="header">
			<span class="title">Asteroid</span>
		</div>
		<div class="content" id="fleet-movement-content">
        <table id="fleet-movement-table" class="fleet-movement-table">
			<tbody>`	
	

	$(filters).each(function(index, data) {
		let sourceMoonContent
		let destinationMoonContent
		
		if (data.source.isMoon) {
			sourceMoonContent = `<img style="width:16px;height:16px;display:inline-block;vertical-align:middle;" class="tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Moon</div>" src="/assets/images/moon-icon.gif?v=2">`
		} else {
			sourceMoonContent = ""
		}
		
		if (data.destination.isMoon) {
			destinationMoonContent = `<img style="width:16px;height:16px;display:inline-block;vertical-align:middle;" class="tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Moon</div>" src="/assets/images/moon-icon.gif?v=2">`
		} else {
			destinationMoonContent = ""
		}
		
		content += `
			<tr data-fleet-id="0ec66706-3275-466a-868d-07ce618f5b33" class="row-mission-type-ASTEROID_MINING  row-fleet-return">
				<td data-remaining-seconds="` + data.leftTime + `" class="x-calc-fleet-time col-mission-time tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>11.07.2024 16:40:38</div>"></td>
				<td><img src="/assets/images/V2/mission/ASTEROID_MINING.png?v=2" style="cursor:help;" class="tooltip" data-tooltip-position="top" data-tooltip-content="<div style='font-size:11px;'>Asteroid Mining</div>"></td>
				<td>
					` + sourceMoonContent + data.source.name + ` <a href="/galaxy?x=1&amp;y=145" class="fleet-source-coords">` + data.source.cords + `</a>
				</td>

				<td><span style="cursor:help;" class="tooltip" data-tooltip-position="bottom" data-tooltip-content="` + data.details +`">` + data.ships + `</span></td>

				<td>
					<a href="#" style="cursor:help;" class="tooltip" data-tooltip-position="bottom" data-tooltip-content="` + data.details +`"><img style="width:16px;height:16px;" src="/assets/images/fleet-movement-icon-reverse.gif?v=2"></a>
				</td>

				<td>
					` + destinationMoonContent + data.destination.name + ` <a href="/galaxy?x=1&amp;y=202&amp;z=17" style="color:#AAA;font-size:11px;text-decoration:none;">` + data.destination.cords + `</a>
				</td>

				<td>
				</td>
			</tr>
		`
		
		// Dodanie informacji o misji
		YourFrogAddMissionIconToPlanets(data.source.cords, data.details, 'silver')
	})

	content += `
				</tbody>					
			</table>
		</div>
	`

	$('div#content-wrapper').prepend(content);
}

function YourFrogMiners() {
	let content = `
	<div id="yourfrog-miners" class="fleet-movement-wrapper opened">
		<div class="header">
			<span class="title">Miners back</span>
		</div>
		<div class="content" id="fleet-movement-content">
        <table id="fleet-movement-table" class="fleet-movement-table">
			<tbody>`

	let asteroid = []
	let transport = []
	let expedition = []
	
	$('table#fleet-movement-table tr').each(function() {
		let destination = {
			isMoon: false,
			name: $('td', this).eq(5).clone().children().remove().end().text(),
			cords: $('td', this).eq(5).find("a").text(),
		}
		
		let source = {
			isMoon: false,
			name: $('td', this).eq(2).clone().children().remove().end().text(),
			cords: $('td', this).eq(2).find("a").text(),
		}
		
		if (
			$('td', this).eq(5).find('img').length > 0 
			&& $('td', this).eq(5).find('img').attr('src').includes("/assets/images/moon-icon.gif?v=2")
		) {
			destination.isMoon = true
		}
		
		if (
			$('td', this).eq(2).find('img').length > 0 
			&& $('td', this).eq(2).find('img').attr('src').includes("/assets/images/moon-icon.gif?v=2")
		) {
			source.isMoon = true
		}
		
		let data = {
			isAsteroid: $('td', this).eq(1).find('img').attr('src').includes("/assets/images/V2/mission/ASTEROID_MINING.png?v=2"),
			isTransport: $('td', this).eq(1).find('img').attr('src').includes("/assets/images/V2/mission/TRANSPORT.png?v=2"),
			isExpedition: $('td', this).eq(1).find('img').attr('src').includes("/assets/images/V2/mission/EXPEDITION.png?v=2"),
			leftTime: $('td', this).eq(0).attr("data-remaining-seconds"),
			isBack: $('td', this).eq(4).find("img").attr("src").includes("icon-reverse"),
			ships: $('td', this).eq(3).text(),
      details: $('td', this).eq(4).find("a").data("tooltip-content"),
			source: source,
			destination: destination,
		}
    
    
		if (data.isAsteroid) { asteroid.push(data) }
		if (data.isTransport) { transport.push(data) }
		if (data.isExpedition) { expedition.push(data) }
	});

	YourFrogDrawExpedition(expedition)
	YourFrogDrawTransport(transport)
	YourFrogDrawAsteroid(asteroid)
  
  unsafeWindow.ConfigureTooltips()
}

	
$(document).ready(function() {
  console.log("YourFrog - Run");
  
	setInterval(function() {
		let exists = {
			miners: $('#yourfrog-miners, #yourfrog-expedition, #yourfrog-transport').length != 0,
			fleet: $('#layoutFleetMovements #fleet-movement-content').text().length != 0
		}
		
		if (!exists.miners && exists.fleet) {
			YourFrogMiners()
		}
	}, 500)
});