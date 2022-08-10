// ==UserScript==
// @name         Hygie - All AMS Viseo Dashboard DEV
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  Display dynamically all KPI table available for All AMS Viseo
// @author       Nicolas DUPRE
// @match        https://hygie/tickets/open/team/all_ams_viseo/?local_tz=Europe/Paris
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @updateURL    file://C:\Users\dupreni\Desktop\jslib\Hygie\Dashboard\Hygie.Dashboard.tampermonkey.dev.user.js
// @downloadURL  file://C:\Users\dupreni\Desktop\jslib\Hygie\Dashboard\Hygie.Dashboard.tampermonkey.dev.user.js
// @require      https://cdn.jsdelivr.net/gh/neooblaster/nativejs-proto-extensions/nativejs-proto-extensions.min.js
// @require      https://rawcdn.githack.com/neooblaster/HTML/aa9263b08705a9676416f2ba64b474daa3a62945/release/v1.4.0/HTML.min.js
// @require      https://cdn.jsdelivr.net/npm/less@4.1.1
// @require      file://C:\Users\dupreni\Desktop\jslib\Hygie\Dashboard\Hygie.Dashboard.user.js
// ==/UserScript==
(function() {
    'use strict';
    /**
     * ------------------------------------------------------------------------
     *   Description
     * ------------------------------------------------------------------------
     *  The purpose of this user script is to display in full script each
     *  report/table at once with a delay.
     *  It's also responsible to refresh the screen. Hygie page are generated.
     *  So there is no dynamic data refresh.
     *  Page loading is quite long (16.85s for 4.7MB)
     *  To prevent blank screen, before reloading the page, we should store
     *  the last table to rebuild it during the loading.
     *  That mean, this user script must be executed immediately and
     *  wait the document is loaded to repeat the process.
     *
     * ------------------------------------------------------------------------
     */
    // @run-at document-end



    /**
     * ------------------------------------------------------------------------
     *   Bridging Resources
     * ------------------------------------------------------------------------
     */
    window.HTML = HTML;



    /**
     * ------------------------------------------------------------------------
     *   Local functions
     * ------------------------------------------------------------------------
     */
    function loadLess ($sStylesheet){
        // Add new link reference for our LESS Stylesheet.
        document.querySelector('html head').appendChild(new HTML().compose({
            name: 'link',
            attributes: {
                rel: 'stylesheet/less',
                type: 'text/css',
                //href: `https://raw.githubusercontent.com/neooblaster/jslib-deliver/master/Kibana/M2020/stylesheet.less?ts=${new Date().getTime()}1`

                // href: `http://127.0.0.1:8887/stylesheet.less`
                href: $sStylesheet
            },
            properties: {
                onload: function(){
                    // Apply newly loaded stylesheet
                    less.registerStylesheets();
                    less.refresh();
                    less.watch();
                }
            }
        }));
        // Apply newly loaded stylesheet
        less.registerStylesheets();
        less.refresh();
        less.watch();
    }



    /**
     * ------------------------------------------------------------------------
     *   Execution
     * ------------------------------------------------------------------------
     */
    // Loading Stylesheet :
    // --- DEV Version - Require Web Server for Chrome
    loadLess(`http://127.0.0.1:8887/stylesheet.less`);

    // --- PROD Version
    // loadLess(`https://raw.githubusercontent.com/neooblaster/jslib-deliver/master/Hygie/Dashboard/stylesheet.less?ts=${new Date().getTime()}`);






    // function isLoaded () {
    //     let KibanaMenu = document.querySelector('table.kbn-table');
    //
    //     if(!KibanaMenu){
    //         setTimeout(isLoaded, 500);
    //     } else {
    //         window.M2020 = new M2020().init();
    //     }
    // }
    //
    // // Only set up for tab Discovery
    // if(/discover/.test(document.location.href)) {
    //     isLoaded();
    // }
})();