/**
 * Version: 1.0.1
 *
 * @author: Nicolas DUPRE (VISEO)
 *
 * ------------------------------------------------------------------------
 *  Change Log :
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
     * XML Node path to data for analysis
     * @type {{request: {loginName: string, inputParams: string}, response: {returnCode: string, returnMessage: string}}}
     * @private
     */
    self._xmlPaths = {
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
        }
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
                                onclick: self.collect
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

            // Build Report (UCS List & Errors List)
            report: function () {
                // UCS Table Report
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

                // Errors Table Reports
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

                self._htmlelements.report.ucs = new HTML().compose(oUcsTable);
                self._htmlelements.report.errors = new HTML().compose(oErrorsTable);

                let oReport = {
                    attributes: {id: 'm2020-report'},
                    children: [
                        // Cross to close report
                        {attributes: {id: 'close-report'}, properties: {innerHTML: '&#xe03e;', onclick: self.closeReport}},
                        // Caption
                        {name: 'h2', properties: {textContent: "UCS List"}},
                        // UCS Table
                        {element: self._htmlelements.report.ucs},
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
     * Read table result according to filters set.
     */
    self.collect = function () {
        // Log entry fields to collect
        let aFields = ['_id', 'request', 'response'];

        // Close before reopening to reload data (if timerange changed)
        if (!self._bExpended) {
            self.expend();
        }
        self.expend();

        // Read all logs entries
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

            if (!self._indexes.id.hasOwnProperty(oRowData['_id'])) {
                self._indexes.id[oRowData['_id']] = self._data.length;
                self._data.push(oRowData);
            }
        });

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
                    errors: {}
                }
            }
        }

        // Clear reports data
        self._consolidateData.reports.ucs = {};
        self._consolidateData.reports.errors = {};

        // Parse Data
        self._data.forEach(function ($oData) {
            // Collected Data
            let sId = $oData._id;
            let sRequest = $oData.request;
            let sResponse = $oData.response;

            // Engine for parsing
            let oRequest = new fxparser.XMLParser(self._xmlParserOptions).parse(sRequest);
            let oResponse = new fxparser.XMLParser(self._xmlParserOptions).parse(sResponse);

            // Handling Request (-> For detail log in mail)
            let sLoginName = self.getXmlNode(oRequest, self._xmlPaths.request.loginName);
            let oInputParams = self.getXmlNode(oRequest, self._xmlPaths.request.inputParams);

            let prodOrder = oInputParams.getValueForPath('I_PRODUCTION_ORDER');
            let completeQuantity = oInputParams.getValueForPath('I_QUANTITY_COMPLETE');
            let ucsNumber = oInputParams.getValueForPath('I_UCS_NUMBER');

            // Handling Response (-> Define Error Message Type)
            let sReturnCode = self.getXmlNode(oResponse, self._xmlPaths.response.returnCode);
            let sReturnMessage = self.getXmlNode(oResponse, self._xmlPaths.response.returnMessage);

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
                ucsNumber: ucsNumber
            };
            if (self._consolidateData.id.hasOwnProperty(sId)) {
                self._consolidateData.messages[self._consolidateData.id[sId]] = oMessage;
            } else {
                self._consolidateData.id[sId] = messageIndex;
                self._consolidateData.messages.push(oMessage);
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
            // Error is to indicates an error has occures but finished OK
            if (sReturnCode === 999) {
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
        });


        // Consolidation
        self._consolidateData.messages.forEach(function ($oMessage) {
            let sUcs = $oMessage.ucsNumber;
            let sProdOrder = $oMessage.prodOrder;
            let nReturnCode = $oMessage.returnCode;
            let sReturnMessage = $oMessage.returnMessage;
            let sMessagePattern = $oMessage.messagePattern;
            let nCompleteQuantity = $oMessage.completeQuantity;

            // UCS Report :
            if(!self._consolidateData.reports.ucs[sUcs]) self._consolidateData.reports.ucs[sUcs] = {
                ucs: sUcs,
                prodOrder: sProdOrder,
                status: self._consolidateData.ucs[sUcs].status || 'NOT FOUND',
                resolveStatus: self._consolidateData.ucs[sUcs].resolveStatus || 'NOT FOUND',
                resolved: self._consolidateData.ucs[sUcs].resolved
            };

            // Error Report :
            if (nReturnCode === 999) {
                if (!self._consolidateData.reports.errors[sMessagePattern]) {
                    self._consolidateData.reports.errors[sMessagePattern] = {
                        occurrences: 0,
                        messages: [],
                        messagesOccurrences: {},
                        inputs: []
                    };
                }

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
            // ---> Change filter param 'response' to 'request'
            //let sNewLocation = sLocation.replace(/(key:)response/, '$1request');
            let sNewLocation = sLocation.replace(/response/g, 'request');
            // ---> Change filter param value '999' to UCS
            sNewLocation = sNewLocation.replace(/999/g, $sUcs);
            document.location.href = sNewLocation;

            // Delay execution for waiting loading
            setTimeout(function () {
                self.resolveUCS.call(this, $sUcs, false);
            }.bind(this), 250);
        }

        // Continue execution next to setTimeout.
        if (!$bInitialCall) {
            // Check if loading if finished
            let oLoadingElement = document.querySelector(self._selectors.others.loading);

            // Recollect Data (table updated) + Update
            if (oLoadingElement.classList.contains('hidden')) {
                self._consolidateData.ucs[$sUcs].resolved = true;
                self.collect();
                self.display();
            } else {
                // Delay for retry
                setTimeout(function () {
                    self.resolveUCS.call(this, $sUcs, false);
                }.bind(this), 250);
            }
        }
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
        if(!self._data.length){
            self.collect();
        }

        let oData = self._consolidateData;

        // If report is already display, remove it
        self.closeReport();

        // (re) build reports
        self._hosts.document.appendChild(self.build().report());

        // Build UCS Report Table
        for (let sUcs in oData.reports.ucs) {
            if(!oData.reports.ucs.hasOwnProperty(sUcs)) continue;
            let oUcs = oData.reports.ucs[sUcs];
            self._htmlelements.report.ucs.appendChild(self.build().ucsRow(oUcs));
        }

        // Build Error Report Table
        for (let sErrorPattern in oData.reports.errors) {
            if(!oData.reports.errors.hasOwnProperty(sErrorPattern)) continue;
            let oError = oData.reports.errors[sErrorPattern];
            self._htmlelements.report.errors.appendChild(self.build().errorRow(oError))
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

        return self;
    };

    return self;
}