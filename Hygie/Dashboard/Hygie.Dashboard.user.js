/**
 * Version: 1.0.0
 *
 * @author: Nicolas DUPRE (VISEO)
 *
 * ------------------------------------------------------------------------
 *  Change Log :
 * ------------------------------------------------------------------------
 *  - Version 1.0.0 : 2022.XX.XX
 * ------------------------------------------------------------------------
 *  • Initial version.
 *
 * ------------------------------------------------------------------------
 *
 * @return {M2020}
 *
 * @constructor
 */
function HygieDashboard () {
    let self = this;

    /**
     * Centralisation of HTML Selector for maintenance.
     * @type
     * @private
     */
    self._selectors = {
        // Hosts are used for HTML Element appends
        hosts: {
            document: 'body'
        },
        // Others are used to retrieve/read (sub) elements
        others: {
        }
    };

    /**
     * Store retrieved HTML Element Hosts reference to simplify usage.
     * @type
     * @private
     */
    self._hosts = {
        document: null
    };

    /**
     * Store Own M2020 HTML Element created & append to prevent further document.querySelector statements.
     * @type
     * @private
     */
    self._htmlelements = {
    };

    self.build = function () {
        return {

        };
    };

    /**
     * Retrieve hosts elements (querySelector)
     *
     * @param {Object} $oSelectors  querySelectors elements to retrieve.
     * @param {Object} $oHosts      output reference to store  retrieved elements.
     */
    self.getHost = function ($oSelectors, $oHosts) {
        for (let item in $oSelectors) {
            if(!$oSelectors.hasOwnProperty(item)) continue;
            let mSelector = $oSelectors[item];

            if (typeof mSelector === 'string') {
                $oHosts[item] = document.querySelector(mSelector);
            } else {
                self.getHost(mSelector, $oHosts[item]);
            }
        }
    };

    /**
     * Initialization method
     *
     * @return {M2020}
     */
    self.init = function(){
        // Retrieve Hosts
        self.getHost(self._selectors.hosts, self._hosts);

        // // Build new buttons
        // let oRefElement = self._hosts.menu.querySelector('button:nth-child(4)');
        // oRefElement.parentNode.insertBefore(self.build().menu().expend(), oRefElement);
        // oRefElement.parentNode.insertBefore(self.build().menu().collect(), oRefElement);
        // oRefElement.parentNode.insertBefore(self.build().menu().display(), oRefElement);
        //
        // // Build Overlay
        // self._hosts.document.appendChild(self.build().overlay());
        //
        // // Build Console
        // self._hosts.document.appendChild(self.build().console());

        return self;
    };

    return self
}
