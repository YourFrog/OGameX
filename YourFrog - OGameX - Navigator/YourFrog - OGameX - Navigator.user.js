// ==UserScript==
// @name     YourFrog - OGameX - Navigator
// @version  1
// @include  *hyper.ogamex.net/*
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js 
// @updateURL 
// @version 1
// @grant           GM.setValue
// @grant           GM.getValue
// ==/UserScript==

/**
 *	Obiekt wspierający nawigację po grze
 */
let navigator = {
  /**
   *	Uruchomienie strony o podanej scieżce z opcją ustawienia stanu
   *
   * @pathname
   * @scriptState 
   */
	goToPage: async function(pathname, scriptState) {
  
  if (typeof scriptState == "undefined") {
    scriptState = STATE_NOTHING
  }
  
  state_set(scriptState)
  window.location = pathname
}


/**
 *	Obiekt przechowujący aktualny stan bota
 */
let state = {
  
	reset: async function() {
    await GM.setValue('script_state', STATE_NOTHING);
  }

	set: async function(value) {
    await GM.setValue('script_state', value);
  }

	get: async function() {
    return await GM.getValue('script_state', STATE_NOTHING);
  }
}