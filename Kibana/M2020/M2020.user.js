function M2020 () {
    let self = this;

    self._selectors = {
        menu: 'div.kuiLocalMenu'
    };

    self._hosts = {
        menu: null
    };

    self._htmlelements = {
        menu: {
            collect: null,
            display: null
        }
    };

    self.build = function () {
        return {
            menu: function () {
                return {
                    collect: function(){

                    },

                    display: function () {

                    }
                }
            }
        };
    };

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

    self.init = function(){
        console.log('M2020.init');

        // Retrieve Hosts
        self.getHost(self._selectors, self._hosts);

        return self;
    };

    return self;
}