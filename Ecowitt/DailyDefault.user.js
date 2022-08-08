// ==UserScript==
// @name         Ecowitt Daily Default
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  F*** Off the default 24 Hours. Return back to daily (00h - 23h59)
// @author       Nicolas DUPRE
// @match        https://www.ecowitt.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ecowitt.net
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function isLoaded() {
        let oTimeRange = document.querySelector('.time-select-box .ivu-select-item');

        if(oTimeRange){
            oTimeRange.click();
        } else {
            setTimeout(isLoaded, 250);
        }
    }

    setTimeout(isLoaded, 5000);
})();
