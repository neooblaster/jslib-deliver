/**
 * Version: 2.0.1
 *
 * @author: Nicolas DUPRE (VISEO)
 *
 * ------------------------------------------------------------------------
 *  Change Log :
 * ------------------------------------------------------------------------
 *  - Version 2.0.1 : 2022.08.09
 * ------------------------------------------------------------------------
 *  • Fix method isNot() where negate properties has the wrong value.
 *
 * ------------------------------------------------------------------------
 *  - Version 2.0.0 : 2022.08.08
 * ------------------------------------------------------------------------
 *  • To check all USC, we need to check different kind of error :
 *      - Response 999
 *      - Mediator Errors
 *    That must be done by generating the appropriate URL (to handle filters)
 *    To do that, we need to parse string structured with parenthesis.
 *    One parse, we can handle data to finally stringify to update URL and
 *    perform checks.
 *
 *  • Add Globals information :
 *      - Total number of error messages : X
 *          - Number of error message for Y : Z
 *          - Number of error message for A : B
 *
 * ------------------------------------------------------------------------
 *  - Version 1.0.1 :
 * ------------------------------------------------------------------------
 *  • Add new element 'Overlay' for 'loading' (Not implemented).
 *      - Including a dialog box for progress message.
 *  • Add a cross button to close Monitoring Report.
 *  • Change Processing Order for method 'display()' :
 *      - Display only trigger data collection if there is no data to display
 *      - Method 'collect' is now responsible of data consolidation.
 *  • Rename button 'Collect' to 'M2020 UCS Check'
 * ------------------------------------------------------------------------
 *
 * @return {M2020}
 *
 * @constructor
 */
function M2020 () {
    let self = this;

    /**
     * Automatically search message for each UCS found in Error to resolve them.
     * @type {boolean}
     * @private
     */
    self._bAutoResolve = true;

    /**
     * Indicates if a resolution of UCS is in progress.
     * @type {boolean}
     * @private
     */
    self._bResolvingUCS = false;

    /**
     * Indicates if log details are expanded by M2020.
     * @type {boolean}
     * @private
     */
    self._bExpended = false;

    /**
     * Centralisation of HTML Selector for maintenance.
     * @type {{hosts: {document: string, menu: string, table: string}, others: {expendButton: string, rowData: string, loading: string}}}
     * @private
     */
    self._selectors = {
        // Hosts are used for HTML Element appends
        hosts: {
            document: 'body',
            menu: 'div.kuiLocalMenu',
            table: 'table.kbn-table'
        },
        // Others are used to retrieve/read (sub) elements
        others: {
            expendButton: '.kbnDocTableOpen__button',
            rowData: 'tr[data-test-subj="docTableDetailsRow"]',
            loading: 'div.kbnLoadingIndicator'
        }
    };

    /**
     * Definition of Message to collect from Kibana (Business Object must
     * be collect UCS)
     *
     * Possible Operators :
     *  is
     *  isNot
     *  isOneOf
     *  isNotOneOf
     *  exists
     *  doesNotExist
     */
    self._monitoredError = {
        // Standard Error from MII
        error999: {
            name: "Error MII 999",
            watcher: null,
            sucessCode: '',
            filters: [
                {
                    key: 'apiName',
                    operator: 'is',
                    value: 'SAP_TTAGREGATIONUCSCOMPLETE'
                },
                {
                    key: 'response',
                    operator: 'is',
                    value: '999'
                }
            ],
            xmlPaths: {
                // Log Request Content
                request: {
                    loginName: 'soap:Envelope/soap:Body/XacuteRequest/LoginName',
                    inputParams: 'soap:Envelope/soap:Body/XacuteRequest/InputParams',
                },
                // Log Response Content
                response: {
                    returnCode: 'soap:Envelope/soap:Body/XacuteResponse/Rowset/Row/O_RETURN_CODE',
                    returnMessage: 'soap:Envelope/soap:Body/XacuteResponse/Rowset/Row/O_RETURN_MSG'
                }
            }
        },

        // Specific Error
        mediator: {
            name: "Error Mediator",
            watcher: null,
            sucessCode: '',
            filters: [
                {
                    key: 'apiName',
                    operator: 'is',
                    value: 'SAP_TTAGREGATIONUCSCOMPLETE'
                },
                {
                    key: 'response',
                    operator: 'is',
                    value: 'Mediator'
                }
            ],
            xmlPaths: {
                // Log Request Content
                request: {
                    loginName: 'soap:Envelope/soap:Body/XacuteRequest/LoginName',
                    inputParams: 'soap:Envelope/soap:Body/XacuteRequest/InputParams',
                },
                // Log Response Content
                response: {
                    returnCode: 'soapenv:Envelope/soapenv:Body/soapenv:Fault/faultcode',
                    returnMessage: 'soapenv:Envelope/soapenv:Body/soapenv:Fault/faultstring'
                }
            }
        }
    };

    /**
     * Which monitoredError to use for xmlPaths when it's "resolveUCS".
     *
     * @type {string}
     * @private
     */
    self._monitoredErrorRef = 'error999';

    /**
     * Centralization of data & flags to handle appropriate check between all
     * initiated watchers standing for one monitored error check process.
     *
     * @type {{collectionDone: boolean, collectionInProgress: boolean, currentMonitoring: null, urlUpdated: boolean}}
     * @private
     */
    self._monitoringController = {
        currentMonitoring: null,
        nextMonitoring: null,
        urlUpdated: false,
        urlLoaded: false,
        collectionInProgress: false,
        collectionDone: false
    };

    /**
     * Store retrieved HTML Element Hosts reference to simplify usage.
     * @type {{document: null, menu: null, table: null}}
     * @private
     */
    self._hosts = {
        document: null,
        menu: null,
        table: null
    };

    /**
     * Store Own M2020 HTML Element created & append to prevent further document.querySelector statements.
     * @type {{report: {ucs: null, root: null, errors: null}, menu: {expend: null, display: null, collect: null}}}
     * @private
     */
    self._htmlelements = {
        menu: {
            expend: null,
            collect: null,
            display: null
        },
        overlay: {
            root: null,
            dialog: null
        },
        report: {
            root: null,
            ucs: null,
            errors: null
        },
        console: null
    };

    /**
     * Internal Index to handle data.
     * @type {{ucs: [], prodord: [], id: []}}
     * @private
     */
    self._indexes = {
        id: [],
        ucs: [],
        prodord: []
    };

    /**
     * Raw collected data.
     * @type {Array}
     * @private
     */
    self._data = [];

    /**
     * Consolidated data use by reports
     * @type {null}
     * @private
     */
    self._consolidateData = null;

    /**
     * Fast-XML-Parser setting options to centralized maintenance.
     * @type {{}}
     * @private
     */
    self._xmlParserOptions = {};

    /**
     * Store starting URL Location used to create UCS Resolution URL Filter.
     * @type {null}
     * @private
     */
    self._responseLocation = null;

    /**
     * Internal Builder Utility.
     *
     * @return {{overlay: overlay, errorRow: (function(*=): *), report: (function(): *), ucsRow: (function(*): *), menu: (function(): {expend: (function(): *), display: (function(): *), collect: (function(): *)})}}
     */
    self.build = function () {
        return {
            /**
             * Element standing for /Discover Menu
             * @return {{expend: (function(): *), display: (function(): *), collect: (function(): *)}}
             */
            menu: function () {
                return {
                    // Expend Button
                    expend: function () {
                        let oExpandButton = {
                            name: 'button',
                            classList: ['kuiLocalMenuItem'],
                            properties: {
                                textContent: 'Expend',
                                onclick: self.expend
                            }
                        };

                        return self._htmlelements.menu.expend = new HTML().compose(oExpandButton);
                    },

                    // Data Collect Button
                    collect: function(){
                        let oCollectButton = {
                            name: 'button',
                            classList: ['kuiLocalMenuItem'],
                            properties: {
                                textContent: 'M2020 USC Check',
                                onclick: self.run
                            }
                        };

                        return self._htmlelements.menu.collect = new HTML().compose(oCollectButton);
                    },

                    // Display Report Button
                    display: function () {
                        let oDisplayButton = {
                            name: 'button',
                            classList: ['kuiLocalMenuItem'],
                            properties: {
                                textContent: 'Display Report',
                                onclick: self.display
                            }
                        };

                        return self._htmlelements.menu.display = new HTML().compose(oDisplayButton);
                    }
                }
            },

            overlay: function () {
                // Making a dialog box to display progress status
                let oDialogBox = {
                    attributes: {
                        id: "m2020-dialogbox"
                    }
                };
                self._htmlelements.overlay.dialog = new HTML().compose(oDialogBox);

                // Building overlay for loading process
                let oOverlay = {
                    attributes: {
                        id: "m2020-overlay"
                    },
                    classList: ['hidden'],
                    children: []
                };
                return self._htmlelements.overlay.root = new HTML().compose(oOverlay);
            },

            // Build a full screen div receiving log message (hidden by default)
            // Handled with self.console()
            console: function () {
                let oConsole = {
                    classList: ['hidden'],
                    attributes: {id: "m2020-console"}
                };

                // Log Console (Hidden)
                return self._htmlelements.console = new HTML().compose(oConsole);
            },

            // Build Report (UCS List & Errors List)
            report: function () {
                /**
                 *  Building report consumme consolidated data :
                 * -------------------------------------------------
                 */
                // --- Defined covered day(s)
                let oDate = new Date();
                let aDays = [
                    ['Satursday'],
                    ['Friday', 'Satursday'],
                    ['Monday'],
                    ['Tuesday'],
                    ['Wednesday'],
                    ['Thurdsay'],
                    ['Friday']
                ];
                let sDays = aDays[oDate.getDay()].join(' and ').toLowerCase();

                // --- Set the total number of errors found by monitored errors + collect total
                let nErrorMessage = 0;
                let oCountDetail = {
                    name: 'ul', attributes: {id: "list-error-by-monitored-error"}, children: []
                };
                for (let sMonitored in self._consolidateData.reports.monitored) {
                    if(!self._consolidateData.reports.monitored.hasOwnProperty(sMonitored)) continue;
                    let nMonitoredNbError = self._consolidateData.reports.monitored[sMonitored];
                    nErrorMessage += nMonitoredNbError;
                    oCountDetail.children.push({
                        name: "li", properties: {innerHTML:
                            `Number of error message for <strong>${self._monitoredError[sMonitored].name}</strong> : <strong>${nMonitoredNbError}</strong>`
                        }
                    })
                }

                // --- Set UCS List report
                let oUcsTable = {
                    name: 'table', attributes: {id: 'table-ucs-list'},
                    children: [
                        {
                            name: 'tr',
                            children: [
                                {name: "th", properties: {textContent: 'UCS'}},
                                {name: "th", properties: {textContent: 'Prod Order'}},
                                {name: "th", properties: {textContent: 'Initial Status'}},
                                {name: "th", properties: {textContent: 'Final Status'}}
                            ]
                        }
                    ]
                };
                for (let sUcs in self._consolidateData.reports.ucs) {
                    if(!self._consolidateData.reports.ucs.hasOwnProperty(sUcs)) continue;
                    let oUcs = self._consolidateData.reports.ucs[sUcs];
                    oUcsTable.children.push({
                        element: self.build().ucsRow(oUcs)
                    });
                }

                // --- Set Error List report
                let oErrorsTable = {
                    name: 'table', attributes: {id: 'table-error-list'},
                    children: [
                        {
                            name: 'tr',
                            children: [
                                {name: "th", properties: {textContent: 'Occurrences'}},
                                {name: "th", properties: {textContent: 'Error Message'}},
                                {name: "th", properties: {textContent: 'Input Params'}}
                            ]
                        }
                    ]
                };
                for (let sErrorPattern in self._consolidateData.reports.errors) {
                    if(!self._consolidateData.reports.errors.hasOwnProperty(sErrorPattern)) continue;
                    let oError = self._consolidateData.reports.errors[sErrorPattern];
                    oErrorsTable.children.push({
                        element: self.build().errorRow(oError)
                    });
                }


                /**
                 *  Assembly of report :
                 * -------------------------------------------------
                 */
                self._htmlelements.report.ucs = new HTML().compose(oUcsTable);
                self._htmlelements.report.errors = new HTML().compose(oErrorsTable);

                let oReport = {
                    attributes: {id: 'm2020-report'},
                    children: [
                        // Cross to close report
                        {attributes: {id: 'close-report'}, properties: {innerHTML: '&#xe03e;', onclick: self.closeReport}},

                        // General infos
                        {children:[
                                {properties: {textContent: `Hello,`}},
                                {name: "br"},
                                {properties: {innerHTML: `Here is the Kibana monitoring report for <span>${sDays}</span>:`}},
                                {name: "br"},
                                {properties: {innerHTML: `Total number of error messages : <span>${nErrorMessage}</span> :`}},
                        ]},
                        // Number or error per monitored error
                        {element: new HTML().compose(oCountDetail)},
                        // Spacer
                        {name: 'br'},

                        // Caption
                        {name: 'h2', properties: {textContent: "UCS List"}},
                        // UCS Table
                        {element: self._htmlelements.report.ucs},
                        // Spacer
                        {name: 'br'},

                        // Caption
                        {name: 'h2', properties: {textContent: "Error List"}},
                        // Errors Table
                        {element: self._htmlelements.report.errors}
                    ]
                };

                return self._htmlelements.report.root = new HTML().compose(oReport)
            },

            /**
             * Build Row for UCS List Table.
             *
             * @param {Object}  $oUcsData  UCS Data
             *
             * @return {HTMLElement}
             */
            ucsRow: function ($oUcsData) {
                let sInitialStatusClass = $oUcsData.status.toLowerCase();
                let sFinalStatusClass = $oUcsData.resolveStatus.toLowerCase();

                let oFinalStatus = (!$oUcsData.resolved) ? {
                    name: 'td',
                    children: [
                        {
                            name: "a", properties: {
                                textContent: "Resolve",
                                onclick: function () {
                                    self.resolveUCS($oUcsData.ucs)
                                }
                            }
                        }
                    ]
                } : {
                    name: 'td',
                    properties: {
                        textContent: $oUcsData.resolveStatus
                    }
                };
                oFinalStatus.classList = [sFinalStatusClass];

                let oUcsRow = {
                    name: 'tr',
                    children: [
                        {name: 'td', properties: {textContent: $oUcsData.ucs}},
                        {name: 'td', properties: {textContent: $oUcsData.prodOrder}},
                        {name: 'td', classList:[sInitialStatusClass], properties: {textContent: $oUcsData.status}},
                        {element: new HTML().compose(oFinalStatus)},
                    ]
                };

                return new HTML().compose(oUcsRow);
            },

            /**
             * Build Row for Error List table.
             *
             * @param {Object} $oErrorData
             *
             * @return {HTMLElement}
             */
            errorRow: function ($oErrorData) {
                // List of Error message
                let oErrorList = {
                    name: 'ul', children: []
                };

                $oErrorData.messages.forEach(function ($sMessage) {
                    oErrorList.children.push({
                        name: 'li', properties: {textContent: `${$sMessage} (x${$oErrorData.messagesOccurrences[$sMessage]})`}
                    })
                });

                // List of Inputs
                let oInputs = {
                    name: 'table', children: [{
                        name: 'tr', children: [
                            {name: "th", properties: {textContent: 'Prod. Order'}},
                            {name: "th", properties: {textContent: 'Complete Qty.'}},
                            {name: "th", properties: {textContent: 'UCS Nr.'}}
                        ]
                    }]
                };

                $oErrorData.inputs.forEach(function ($oInputs) {
                    oInputs.children.push({
                        name: 'tr', children: [
                            {name: 'td', properties: {textContent: $oInputs.prodOrder}},
                            {name: 'td', properties: {textContent: $oInputs.completeQuantity}},
                            {name: 'td', properties: {textContent: $oInputs.ucs}},
                        ]
                    })
                });

                let oErrorRow = {
                    name: 'tr',
                    children: [
                        {name: 'td', properties: {textContent: $oErrorData.occurrences}},
                        {name: 'td', children: [oErrorList]},
                        {name: 'td', children: [oInputs]}
                    ]
                };

                return new HTML().compose(oErrorRow);
            }
        };
    };

    /**
     * Perform log detail expend to trigger data loading.
     */
    self.expend = function () {
        // Click on all expand button available on the screen
        self._hosts.table.querySelectorAll(self._selectors.others.expendButton).forEach(function ($oButton) {
            $oButton.click();
        });

        // Toggle Expended flag & update button text
        self._bExpended = (!self._bExpended);
        self._htmlelements.menu.expend.textContent = (self._bExpended) ? 'Fold' : 'Expand';
    };

    /**
     * Indicates if the pink/purple/violet loading bar is present or not
     *
      * @return {boolean}
     */
    self.isLoading = function () {
        // Check if loading if finished
        let oLoadingElement = document.querySelector(self._selectors.others.loading);

        // If attribute hidden is set, loading is finished
        return !oLoadingElement.classList.contains('hidden');
    };

    /**
     * Run monitoring for defined Monitored Errors
     */
    self.run = function ($bDisplayReport = false ) {
        // Log entry Kibana fields to collect
        let aMonitoring = [];

        // We must perform control on result for each kind of error
        for (let sMonitoredError in self._monitoredError) {
            if(!self._monitoredError.hasOwnProperty(sMonitoredError)) continue;
            aMonitoring.push(sMonitoredError);
        }

        aMonitoring.forEach(function ($sMonitoring, $nIndex) {
            let sNextMonitoring = (( $nIndex + 1) < aMonitoring.length) ? aMonitoring[$nIndex+1] : null;

            // Create a "watcher" to check it own result
            self._monitoredError[$sMonitoring].watcher = setInterval(function ($sWatchingFor, $sNextMonitoring) {
                // Check if the execution if for us
                if (self._monitoringController.currentMonitoring === $sWatchingFor) {
                    // Check if the URL has been set
                    if (!self._monitoringController.urlUpdated) {
                        //  Create the appropriate URL to get logs :
                        // -----------------------------------------
                        let oUrl = self.url(document.location.href);

                        // --- Flush current filter :
                        oUrl.filters().reset();

                        // --- Add Filter Criteria :
                        if (self._monitoredError[$sWatchingFor].hasOwnProperty('filters')) {
                            self._monitoredError[$sWatchingFor].filters.map(function ($oFilter) {
                                oUrl.filters().add($oFilter['key'])[$oFilter['operator']]($oFilter['value']);
                            });
                        }

                        // --- Indicates URL set
                        self._monitoringController.urlUpdated = true;

                        // --- Rebuild URL :
                        document.location.href = oUrl.toString();
                    }
                    // If URL set, check if it's still loading
                    else {
                        // Simply add delay to let data to be loaded (force one loop)
                        if (!self._monitoringController.urlLoaded) {
                            self._monitoringController.urlLoaded = true;
                        } else {
                            if (!self._monitoringController.collectionInProgress) {
                                // If not loading, start collection
                                if (!self.isLoading()) {
                                    self._monitoringController.collectionInProgress = true;
                                    self._monitoringController.nextMonitoring = $sNextMonitoring;
                                    self.collect();
                                }
                            } else {
                                // If Collection Done, reset controller and send to the next monitoring
                                if (self._monitoringController.collectionDone) {
                                    clearInterval(self._monitoredError[$sWatchingFor].watcher);
                                    self._monitoredError[$sWatchingFor].watcher = null;

                                    // Turn off flags
                                    self._monitoringController.collectionDone = false;
                                    self._monitoringController.collectionInProgress = false;
                                    self._monitoringController.urlUpdated = false;
                                    self._monitoringController.urlLoaded = false;

                                    // Send signal for next monitoring
                                    self._monitoringController.currentMonitoring = $sNextMonitoring;

                                    // Display report if requested
                                    if ($bDisplayReport && !$sNextMonitoring) {
                                        self.display();
                                    }
                                }
                            }
                        }

                    }
                }
            }.bind(this, $sMonitoring, sNextMonitoring), 250);
        });

        // Set first monitoring
        if (aMonitoring.length) {
            self._monitoringController.currentMonitoring = aMonitoring[0];
        }

        // UCS Resolution must be done at the end.
        // Auto Resolving UCS
        if (self._bAutoResolve) {
            var interval = setInterval(function () {
                if (!self.isRunning()) {
                    let bAutoResolveDone = false;
                    let sUCSToResolve = null;

                    // Trigger an UCS Resolution if there is no resolution in progress
                    if (!self._bResolvingUCS) {
                        // Search for an unresolved UCS
                        for (let sUCS in self._consolidateData.ucs) {
                            if(!self._consolidateData.ucs.hasOwnProperty(sUCS)) continue;

                            if (!self._consolidateData.ucs[sUCS].resolved) {
                                sUCSToResolve = sUCS;
                                break;
                            }
                        }

                        // If UCS Number has been found, start resolution
                        if (sUCSToResolve) {
                            self.resolveUCS(sUCSToResolve);
                        } else {
                            bAutoResolveDone = true;
                        }
                    }

                    // Auto resolution finished
                    if (bAutoResolveDone) {
                        clearInterval(interval);

                        // Return to the initial search
                        // Only if it was the last monitored error
                        if (!self._monitoringController.currentMonitoring) {
                            // document.location.href = self._responseLocation;
                        }

                        // Indicates collection is done and set the next monitoring
                        self._monitoringController.collectionDone = true;
                    }
                }
            }, 500);
        } else {
            // Indicates collection is done
            self._monitoringController.collectionDone = true;
        }
    };

    /**
     * Indicates if at least one watcher is running (waiting for run)
     *
     * @return {boolean}
     */
    self.isRunning = function(){
        for (let sMonitoring in self._monitoredError) {
            if(!self._monitoredError.hasOwnProperty(sMonitoring)) continue;

            if (self._monitoredError[sMonitoring].watcher) {
                return true;
            }
        }
        return false;
    };

    /**
     * Read table result according to filters set.
     */
    self.collect = function () {
        // Log entry Kibana fields to collect
        let aFields = ['_id', 'request', 'response'];

        // Table is regenerated, so reference is kept but pointing to non existing object
        // Refresh Hosts
        self.getHost(self._selectors.hosts, self._hosts);

        // Read all logs entries
        if (self._hosts.table) {
            // Close before reopening to reload data (if time range has changed)
            if (!self._bExpended) {
                self.expend();
            }
            self.expend();

            self._hosts.table.querySelectorAll(self._selectors.others.rowData).forEach(function ($oRow) {
                let oRowData = {};
                let cFields = $oRow.querySelectorAll('table tr');

                // Read fields
                cFields.forEach(function ($oDataRow) {
                    let oFieldName = $oDataRow.querySelector('td:nth-child(1)');
                    let oFieldValue = $oDataRow.querySelector('td:nth-child(3)');

                    let sFieldName = oFieldName.querySelector('span.dscFieldName').textContent;

                    if (aFields.lastIndexOf(sFieldName) >= 0) {
                        oRowData[sFieldName] = oFieldValue.querySelector('span[ng-non-bindable]').textContent;
                    }
                });

                // Set which monitored error returns the entry
                oRowData['_owner'] = self._monitoringController.currentMonitoring;

                if (!self._indexes.id.hasOwnProperty(oRowData['_id'])) {
                    self._indexes.id[oRowData['_id']] = self._data.length;
                    self._data.push(oRowData);
                }
            });
        }

        // Perform consolidation
        self.consolidate();
    };

    /**
     * Consolidate collected data for final reports.
     *
     * @return {null|*}
     */
    self.consolidate = function () {
        // Initialize Consolidated Data if not exist.
        if (!self._consolidateData) {
            self._consolidateData = {
                id: [],
                ucs: {},
                prodord: {},
                messages: [],
                reports: {
                    ucs: {},
                    errors: {},
                    monitored: {}
                }
            }
        }

        // Clear reports data
        self._consolidateData.reports.ucs = {};
        self._consolidateData.reports.errors = {};
        self._consolidateData.reports.monitored = {};

        // Parse Data
        self._data.forEach(function ($oData) {
            // Collected Data
            let sId = $oData._id;
            let sRequest = $oData.request;
            let sResponse = $oData.response;
            let sOwner = $oData._owner;

            if (sOwner === self._monitoringController.currentMonitoring) {
                // Engine for parsing
                let oRequest = new fxparser.XMLParser(self._xmlParserOptions).parse(sRequest);
                let oResponse = new fxparser.XMLParser(self._xmlParserOptions).parse(sResponse);

                // Handling Request (-> For detail log in mail)
                // -> If currentMonitoring is null, that mean the collection is standing for UCS Resolution.
                // -> UCS Resolution must be done as like error999 settings
                let sMonitoringRef = '';
                if (self._monitoringController.currentMonitoring && self._monitoringController.currentMonitoring !== 'resolveUCS') {
                    sMonitoringRef = self._monitoringController.currentMonitoring;
                } else {
                    sMonitoringRef = self._monitoredErrorRef;
                }
                let oXmlPath = self._monitoredError[sMonitoringRef].xmlPaths;

                let sLoginName = '';
                try {
                    sLoginName = self.getXmlNode(oRequest, oXmlPath.request.loginName);
                } catch ($sErr) {
                    sLoginName = 'N/A';
                }

                let oInputParams = {};
                let prodOrder = '';
                let completeQuantity = '';
                let ucsNumber = '';

                try {
                    oInputParams = self.getXmlNode(oRequest, oXmlPath.request.inputParams);
                    prodOrder = oInputParams.getValueForPath('I_PRODUCTION_ORDER');
                    completeQuantity = oInputParams.getValueForPath('I_QUANTITY_COMPLETE');
                    ucsNumber = oInputParams.getValueForPath('I_UCS_NUMBER');
                } catch ($sErr) {
                    prodOrder = 'N/A';
                    completeQuantity = 'N/A';
                    ucsNumber = 'N/A';
                }

                // Handling Response (-> Define Error Message Type)
                let sReturnCode = '';
                try {
                    sReturnCode = self.getXmlNode(oResponse, oXmlPath.response.returnCode);
                } catch ($sErr) {
                    sReturnCode = 999;
                }

                let sReturnMessage = '';
                try {
                    sReturnMessage = self.getXmlNode(oResponse, oXmlPath.response.returnMessage);
                } catch ($sErr) {
                    sReturnMessage = 'ERROR: Automated Kibana monitoring not able to process error message';
                }

                let messageIndex = self._consolidateData.messages.length;

                // Collect / update parsed data
                // --- Collect all messages found (parsed)
                let oMessage = {
                    id: sId,
                    returnCode: sReturnCode,
                    returnMessage: sReturnMessage,
                    messagePattern: self.messageToPattern(sReturnMessage),
                    prodOrder: prodOrder,
                    completeQuantity: completeQuantity,
                    ucsNumber: ucsNumber,
                    owner: sOwner
                };

                // Set / Update message text
                // --- Do not append message get from UCS Resolution
                if (sOwner !== 'resolveUCS') {
                    if (self._consolidateData.id.hasOwnProperty(sId)) {
                        self._consolidateData.messages[self._consolidateData.id[sId]] = oMessage;
                    } else {
                        self._consolidateData.id[sId] = messageIndex;
                        self._consolidateData.messages.push(oMessage);
                    }
                }

                // --- Handle data at UCS Level to identify false positive
                if (!self._consolidateData.ucs[ucsNumber]) {
                    self._consolidateData.ucs[ucsNumber] = {
                        resolveStatus: '-',
                        status: '-',
                        messages: [],
                        resolved: false
                    }
                }
                if(self._consolidateData.ucs[ucsNumber].messages.lastIndexOf(messageIndex) === -1) self._consolidateData.ucs[ucsNumber].messages.push(messageIndex);

                // If a SUCCESS message exist, the final status if SUCCESS
                // Error is to indicates an error has occurs but finished OK
                // if (sReturnCode === 999) {
                let sSucessReturnCode = (self._monitoredError[sOwner]) ? self._monitoredError[sOwner].sucessCode.toString() : '';
                if (String(sReturnCode) !== String(sSucessReturnCode)) {
                    self._consolidateData.ucs[ucsNumber].status = 'ERROR';
                } else {
                    self._consolidateData.ucs[ucsNumber].resolveStatus = 'SUCCESS';
                    self._consolidateData.ucs[ucsNumber].resolved = true;
                }

                // For Final report, if 'resolved' is true but no SUCCESS messsage,
                // That mean resolution did not find SUCCESS message and final status
                // is ERROR
                if (self._consolidateData.ucs[ucsNumber].resolved && self._consolidateData.ucs[ucsNumber].resolveStatus === '-') {
                    self._consolidateData.ucs[ucsNumber].resolveStatus = self._consolidateData.ucs[ucsNumber].status;
                }

                // --- Collect Prod Order Infos
                if (!self._consolidateData.prodord[prodOrder]) {
                    self._consolidateData.prodord[prodOrder] = {
                        completeQuantity: 0,
                        ucs: []
                    };
                }
                self._consolidateData.prodord[prodOrder].completeQuantity = completeQuantity;
                if (self._consolidateData.prodord[prodOrder].ucs.lastIndexOf(ucsNumber) === -1) {
                    self._consolidateData.prodord[prodOrder].ucs.push(ucsNumber);
                }
            }
        });

        // UCS Resolve Statuts
        //  - Some UCS can be resolve without any new message
        //  - In that case, the final status is left as dash ('-')
        //  - For those UCS, set manually final statut to inital statut
        for (let sUCS in self._consolidateData.ucs) {
            if (!self._consolidateData.ucs.hasOwnProperty(sUCS)) continue;

            let oUCS = self._consolidateData.ucs[sUCS];

            if (oUCS.resolved && oUCS.resolveStatus === '-') {
                oUCS.resolveStatus = oUCS.status;
            }
        }

        // Consolidation
        self._consolidateData.messages.forEach(function ($oMessage) {
            let sUcs = $oMessage.ucsNumber;
            let sProdOrder = $oMessage.prodOrder;
            let nReturnCode = $oMessage.returnCode;
            let sReturnMessage = $oMessage.returnMessage;
            let sMessagePattern = $oMessage.messagePattern;
            let nCompleteQuantity = $oMessage.completeQuantity;
            let sOwner = $oMessage.owner;

            // Error Occurrences by Monitored Errors (Do not handle UCS Resolution, internal)
            if(sOwner !== 'resolveUCS' && !self._consolidateData.reports.monitored[sOwner]) self._consolidateData.reports.monitored[sOwner] = 0;

            // UCS Report :
            if(!self._consolidateData.reports.ucs[sUcs]) self._consolidateData.reports.ucs[sUcs] = {
                ucs: sUcs,
                prodOrder: sProdOrder,
                status: self._consolidateData.ucs[sUcs].status || 'NOT FOUND',
                resolveStatus: self._consolidateData.ucs[sUcs].resolveStatus || 'NOT FOUND',
                resolved: self._consolidateData.ucs[sUcs].resolved
            };

            // Error Report :
            let sSucessReturnCode = (self._monitoredError[sOwner]) ? self._monitoredError[sOwner].sucessCode.toString() : '';
            if(String(nReturnCode) !== String(sSucessReturnCode)) {
                if (!self._consolidateData.reports.errors[sMessagePattern]) {
                    self._consolidateData.reports.errors[sMessagePattern] = {
                        occurrences: 0,
                        messages: [],
                        messagesOccurrences: {},
                        inputs: []
                    };
                }

                // Error Occurrences by Monitored Errors (Do not handle UCS Resolution, internal)
                if (sOwner !== 'resolveUCS') self._consolidateData.reports.monitored[sOwner]++;
                self._consolidateData.reports.errors[sMessagePattern].occurrences++;
                if (self._consolidateData.reports.errors[sMessagePattern].messages.lastIndexOf(sReturnMessage) === -1) {
                    self._consolidateData.reports.errors[sMessagePattern].messages.push(sReturnMessage);
                    self._consolidateData.reports.errors[sMessagePattern].messagesOccurrences[sReturnMessage] = 1;
                } else {
                    self._consolidateData.reports.errors[sMessagePattern].messagesOccurrences[sReturnMessage]++;
                }
                self._consolidateData.reports.errors[sMessagePattern].inputs.push({
                    prodOrder: sProdOrder,
                    completeQuantity: nCompleteQuantity,
                    ucs: sUcs
                });
            }
        });

        // Final Consolidation on Errors Message Inputs to prevent duplicate entries
        for (let sMessagePattern in self._consolidateData.reports.errors) {
            if(!self._consolidateData.reports.errors.hasOwnProperty(sMessagePattern)) continue;
            let oDistinct = {};

            self._consolidateData.reports.errors[sMessagePattern].inputs.forEach(function ($oInput) {
                let sKey = `${$oInput.prodOder}${$oInput.completeQuantity}${$oInput.ucs}`;
                if (!oDistinct[sKey]) oDistinct[sKey] = $oInput;
            });

            self._consolidateData.reports.errors[sMessagePattern].inputs = [];

            for (let sKey in oDistinct) {
                if(!oDistinct.hasOwnProperty(sKey)) continue;
                let oInput = oDistinct[sKey];

                self._consolidateData.reports.errors[sMessagePattern].inputs.push(oInput);
            }
        }

        self._monitoringController.collectionDone = true;

        return self._consolidateData;
    };

    /**
     * Update Kibana filter (using URL) to search for all log where
     * UCS Number is in the request.
     *
     * @param {String}  $sUcs           UCS Number to resolve.
     * @param {Boolean} $bInitialCall   Flag to allow async execution to let enough time for loading.
     */
    self.resolveUCS = function ($sUcs, $bInitialCall = true) {
        // To simplify URL Generation
        // Store initial location.href standing for 'response = 999'
        if (!self._responseLocation) {
            self._responseLocation = document.location.href;
        }

        // Initial call generates URL to update Kibana filters & trigger logs refresh
        if ($bInitialCall) {
            // Refresh URL Location
            let sLocation = self._responseLocation;
            let oUrl = self.url(sLocation);

            // Flush current filter :
            oUrl.filters().reset();

            // Set Filter to display UCS
            oUrl.filters().add('apiName').is('SAP_TTAGREGATIONUCSCOMPLETE');  // appName
            oUrl.filters().add('request').is($sUcs);                                  // request = UCS

            // Reload Page
            let sNewUrl = oUrl.toString();
            self.console().log('resolveUCS', [`Initial URL: ${sLocation}`, `Updated URL: ${sNewUrl}`]);
            document.location.href = oUrl.toString();

            // Indicates resolving is in progress
            self._bResolvingUCS = true;

            // Delay execution for waiting loading
            setTimeout(function () {
                self.resolveUCS.call(this, $sUcs, false);
            }.bind(this), 500);
        }

        // Continue execution next to setTimeout.
        if (!$bInitialCall) {
            // Check if loading if finished
            let oLoadingElement = document.querySelector(self._selectors.others.loading);

            // Recollect Data (table updated) + Update
            if (oLoadingElement.classList.contains('hidden')) {
                self._consolidateData.ucs[$sUcs].resolved = true;

                // Indicate the collection is for UCS Resolution
                self._monitoringController.currentMonitoring = 'resolveUCS';
                self.collect();
                self.display();
                // Resolution is finished
                self._bResolvingUCS = false;
            } else {
                // Delay for retry
                setTimeout(function () {
                    self.resolveUCS.call(this, $sUcs, false);
                }.bind(this), 250);
            }
        }
    };

    /**
     * Object to manipulate Kibana URL handling the application settings (filters etc)
     *
     * @param $sUrl
     * @return {*}
     */
    self.url = function ($sUrl) {
        // Split URL into component
        let oUrl = $sUrl.match(/(https?.+)\?_g=(.*)&_a=(.*)/);

        return new function(){
            let xself = this;

            xself._url = {
                base:  oUrl[1],
                _g: ParenthesisParser.parse(oUrl[2]),
                _a: ParenthesisParser.parse(oUrl[3])
            };

            xself.toString = function () {
                let _g = ParenthesisParser.stringify(xself._url._g, ',', ':', ['[$]+'], ['^[0-9]']);
                let _a = ParenthesisParser.stringify(xself._url._a, ',', ':', ['[$]+'], ['^[0-9]']);

                return `${xself._url.base}?_g=${_g}&_a=${_a}`;
            };

            xself.refresh = function () {
                // Refresh setting
            };

            xself.time = function () {
                // Time range of displayed logs
            };

            xself.column = function () {
                return {
                    reset: function () {

                    },

                    add: function ($sColumn) {
                        xself._url._a.columns[$sColumn] = ''; // no tested
                    },

                    remove: function ($sColumn) {
                        delete xself._url._a.columns[$sColumn]; // no tested
                    }
                }
            };

            xself.filters = function () {
                return {
                    reset: function () {
                        // Must be an 'array' with numeric properties.
                        for (let i in xself._url._a.filters) {
                            if (!xself._url._a.filters.hasOwnProperty(i)) continue;
                            delete xself._url._a.filters[i];
                        }

                        return xself;
                    },

                    add: function ($sKey) {
                        let oTemplate = {
                            $state: {
                                store: "appState"
                            },
                            meta: {
                                alias: "!n",
                                disabled: "!f",
                                index: "AW35DAbv8VOwPLJzbS0C",
                                key: "",                             // <-- KEY
                                negate: "!f",
                                type: "phrase",
                                value: "",                           // <-- VAL
                                params: {
                                    query: "",                       // <-- VAL
                                    type: "phrase"
                                }
                            },
                            query: {
                                match: {
                                    // Format (can not be assigned)
                                    // <key> : { query: '', type: 'phrase' }
                                }
                            }
                        };

                        // Search last index
                        let nLastIdx = -1;

                        for (let i in xself._url._a.filters) {
                            if (!xself._url._a.filters.hasOwnProperty(i)) continue;
                            if (/^[0-9]+$/.test(i)) {
                                let nI = parseInt(i);
                                if(nI > nLastIdx) nLastIdx = nI;
                            }
                        }
                        nLastIdx++;

                        return {
                            // Negate : !f
                            is: function ($sValue) {
                                let oObject = Object.assign(oTemplate, {});

                                oObject.meta.key = $sKey;
                                oObject.meta.negate = "!f";
                                oObject.meta.value = $sValue;
                                oObject.meta.params.query = $sValue;
                                oObject.query.match[$sKey] = {
                                    query: $sValue,
                                    type: "phrase"
                                };
                                xself._url._a.filters[nLastIdx] = oObject;

                                return xself;
                            },

                            // Negate :!t
                            isNot: function ($sValue) {
                                let oObject = Object.assign(oTemplate, {});

                                oObject.meta.key = $sKey;
                                oObject.meta.negate = "!t";
                                oObject.meta.value = $sValue;
                                oObject.meta.params.query = $sValue;
                                oObject.query.match[$sKey] = {
                                    query: $sValue,
                                    type: "phrase"
                                };
                                xself._url._a.filters[nLastIdx] = oObject;

                                return xself;
                            },

                            isOneOf: function ($aValues) {
                                // See when need
                                return xself;
                            },

                            isNotOneOf: function ($aValues) {
                                // same as isOneOf avec negate !t
                                return xself;
                            },

                            exists: function () {
                                // See when need
                                return xself;
                            },

                            doesNotExist: function () {
                                // See when need
                                return xself;
                            }
                        }
                    },

                    delete: function () {
                        return xself;
                    },

                    update: function () {
                        return xself;
                    }
                }
            };
        };
    };

    /**
     * Identify a pattern for the provided message:
     *  - Numbers are considered as message variable element
     *  - Capital words are considered as message variable element.
     *
     * @param {String} $sErrorMessage  Message to translate into pattern.
     *
     * @return {string}
     */
    self.messageToPattern = function ($sErrorMessage) {
        let sPattern = $sErrorMessage;

        // Numbers to variable
        sPattern = sPattern.replace(/[0-9]+/g, '[0-9]+');

        // Upper case as Variable (starting from length 2)
        sPattern = sPattern.replace(/[A-Z_-]{2,}/g, '[0-9]+');

        return sPattern;
    };

    /**
     * Retrieve the value of Parsed XML (as Object) using property path.
     *
     * @param {Object} $oXml    Object (parsed from XML) Works with standard objects.
     * @param {String} $sPath   Path to the property in the object (pty1/pty1.1/pty1.1.1)
     *
     * @return {*}
     */
    self.getXmlNode = function($oXml, $sPath) {
        return $oXml.getValueForPath($sPath.replace(/\//g, '.'));
    };

    /**
     * Collect, Consolidate, Build & Display the report.
     */
    self.display = function () {
        // Collect filtered data
        if(!self._consolidateData){
            // Do not display report if some monitoring watcher are running
            let bWatcherExists = false;

            for (let sMonitoring in self._monitoredError) {
                if(!self._monitoredError.hasOwnProperty(sMonitoring)) continue;

                if (self._monitoredError[sMonitoring].watcher) {
                    bWatcherExists = true;
                    break;
                }
            }

            // if no watcher, report can be displayed
            if (!bWatcherExists) {
                self.run(true);
            }
        } else {
            // If report is already display, remove it
            self.closeReport();

            // (re) build reports
            self._hosts.document.appendChild(self.build().report());
        }
    };

    /**
     *
     */
    self.closeReport = function () {
        // If report is already display, remove it
        if (self._htmlelements.report.root) {
            self._htmlelements.report.root.parentNode.removeChild(self._htmlelements.report.root);
            self._htmlelements.report.root = null;
        }
    };

    /**
     * Overlay Manager
     *
     * @return {{toggle: toggle, off: off, on: on}}
     */
    self.overlay = function () {
        return {
            /**
             * Enable / Disable overlay
             */
            toggle: function () {
                if (self._htmlelements.overlay.root.classList.contains('hidden')) {
                    self.overlay().on();
                } else {
                    self.overlay().off();
                }
            },

            /**
             * Turn On the overlay
             */
            on: function () {
                self._htmlelements.overlay.root.classList.remove('hidden');
            },

            /**
             * Turn Off the overlay
             */
            off: function () {
                self._htmlelements.overlay.root.classList.add('hidden');
            }
        }
    };

    /**
     * Console Logger Manager
     *
     * @return {{toggle: toggle, off: off, on: on}}
     */
    self.console = function () {
        return {
            /**
             * Enable / Disable overlay
             */
            toggle: function () {
                if (self._htmlelements.console.classList.contains('hidden')) {
                    self.console().on();
                } else {
                    self.console().off();
                }
            },

            /**
             * Turn On the overlay
             */
            on: function () {
                self._htmlelements.console.classList.remove('hidden');
            },

            /**
             * Turn Off the overlay
             */
            off: function () {
                self._htmlelements.console.classList.add('hidden');
            },

            /**
             * Log an entry in HTML div collecting messages
             *
             * @param {String} $sInitiator  Tag to set in front of the messages
             * @param {Array}  $aMessages   List of message to register
             * @param {Number} $nLevel      Log level
             */
            log: function ($sInitiator, $aMessages = [], $nLevel = 1) {
                let aLevel = ['success', 'error', 'warning', 'info'];

                $aMessages.map(function ($el) {
                    self._htmlelements.console.appendChild(new HTML().compose({
                        classList: ['console-entry', aLevel[$nLevel]],
                        properties: {textContent: `[${$sInitiator}] :: ${$el}`}
                    }));
                });
            },

            /**
             * Clear the HTML div containing all registred messages.
             */
            clear: function () {
                self._htmlelements.console.innerHTML = '';
            }
        }
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

        // Build new buttons
        let oRefElement = self._hosts.menu.querySelector('button:nth-child(4)');
        oRefElement.parentNode.insertBefore(self.build().menu().expend(), oRefElement);
        oRefElement.parentNode.insertBefore(self.build().menu().collect(), oRefElement);
        oRefElement.parentNode.insertBefore(self.build().menu().display(), oRefElement);

        // Build Overlay
        self._hosts.document.appendChild(self.build().overlay());
        
        // Build Console
        self._hosts.document.appendChild(self.build().console());

        return self;
    };

    return self;
}