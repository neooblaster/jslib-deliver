// ==UserScript==
// @name         Hygie - All AMS Viseo Dashboard
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Display dynamically all KPI table available for All AMS Viseo
// @author       Nicolas DUPRE
// @match        https://hygie/tickets/open/team/all_ams_viseo/?local_tz=Europe/Paris
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @updateURL    https://cdn.jsdelivr.net/gh/neooblaster/jslib-deliver@master/Hygie/Dashboard/Hygie.Dashboard.tampermonkey.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/neooblaster/jslib-deliver@master/Hygie/Dashboard/Hygie.Dashboard.tampermonkey.user.js
// @require      https://cdn.jsdelivr.net/gh/neooblaster/nativejs-proto-extensions/nativejs-proto-extensions.min.js
// @require      https://rawcdn.githack.com/neooblaster/HTML/aa9263b08705a9676416f2ba64b474daa3a62945/release/v1.4.0/HTML.min.js
// @require      https://cdn.jsdelivr.net/npm/less@4.1.1
// @require      https://cdn.jsdelivr.net/gh/neooblaster/jslib-deliver@master/Hygie/Dashboard/Hygie.Dashboard.user.js
// ==/UserScript==
(function() {
    'use strict';

    // // @run-at       document-end
    //
    // // Bridging Resources
    // window.HTML = HTML;
    // window.fxparser = fxparser;
    // window.parenthesisParser = ParenthesisParser;
    //
    // // Local functions
    // function isLoaded () {
    //     let KibanaMenu = document.querySelector('table.kbn-table');
    //
    //     if(!KibanaMenu){
    //         setTimeout(isLoaded, 500);
    //     } else {
    //         window.M2020 = new M2020().init();
    //
    //         // Add new link reference for our LESS Stylesheet.
    //         document.querySelector('html head').appendChild(new HTML().compose({
    //             name: 'link',
    //             attributes: {
    //                 rel: 'stylesheet/less',
    //                 type: 'text/css',
    //                 href: `https://raw.githubusercontent.com/neooblaster/jslib-deliver/master/Kibana/M2020/stylesheet.less?ts=${new Date().getTime()}1`
    //             },
    //             properties: {
    //                 onload: function(){
    //                     // Apply newly loaded stylesheet
    //                     less.registerStylesheets();
    //                     less.refresh();
    //                 }
    //             }
    //         }));
    //         // Apply newly loaded stylesheet
    //         less.registerStylesheets();
    //         less.refresh();
    //     }
    // }
    //
    // // Only set up for tab Discovery
    // if(/discover/.test(document.location.href)) {
    //     isLoaded();
    // }
})();