// ==UserScript==
// @name         GameTop No Modal
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.gametop.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gametop.com
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let iInterval = setInterval(function(){
        let oModal = document.querySelector("#adsModal");
        if(oModal){
            console.log('modal deleted');
            oModal.parentNode.removeChild(oModal);
            clearInterval(iInterval);
        }
    }, 250);
})();
