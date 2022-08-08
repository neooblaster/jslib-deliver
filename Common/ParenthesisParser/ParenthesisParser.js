/**
 * Version: 2.0.0
 *
 * @author: Nicolas DUPRE
 *
 * ------------------------------------------------------------------------
 *  Change Log :
 * ------------------------------------------------------------------------
 *  - Version 1.0.0 : 2022.08.08
 * ------------------------------------------------------------------------
 *  • Initial Version
 * ------------------------------------------------------------------------
 *
 * @type {{parse: (function(*=, *=, *=)), stringify: (function(*=, *=, *=, *=, *=): string)}}
 */
var ParenthesisParser = {
    /**
     * Convert structured string using parenthesise
     *
     * @param {String} $sString             Structured string to parse
     * @param {String} $sParamSeparator     Char separating two parameter (defaut is comma (,))
     * @param {String} $sValueSeparator     Char separating in one param the key with its value (default is a colon (:))
     *
     * @return {Object} oObject             Result in JSON Object
     */
    parse: function ($sString, $sParamSeparator = ',', $sValueSeparator = ':') {
        let oObject = {};

        /**
         * ----------------------------------------------------------------
         *  Step 1 : Search for pair : key : value
         * ----------------------------------------------------------------
         * 1. Parenthesis are 'forbidden' in the text standing for the key.
         *
         *
         */
        let bKeySetUp = false;                  // When : is found, key is set up
        let bBackslashUp = false;               // A backslash is found
        let bComposingQuoteString = false;      // Disable check for specific char
        let bBufferingStructure = false;        // If an opening ( is found
        let bBufferingStructureDone = false;
        let nOpeningParenthesisCrossed = 0;     // Count ( crossed to find appropriate closing one
        let sBufferedKey = '';
        let sBufferedValue = null;              // Null is important for lonely keys without values

        // Start from 1, because first char is (
        // Finished to length -1, because last char is )
        for (let i = 1; i < $sString.length - 1; i++) {
            let sChar = $sString[i];

            // Is an opening parenthesis
            if (sChar === '(' && !(bComposingQuoteString && bBackslashUp)) {
                if (!bBufferingStructure) {
                    bBufferingStructure = true;
                } else {
                    nOpeningParenthesisCrossed++;
                }

                // sBufferedValue += sChar;
                if (sBufferedValue === null) {
                    sBufferedValue = sChar;
                } else {
                    sBufferedValue += sChar;
                }
            }

            // Is a closing parenthesis
            else if (sChar === ')' && !(bComposingQuoteString && bBackslashUp) && bBufferingStructure) {
                if (nOpeningParenthesisCrossed) {
                    nOpeningParenthesisCrossed--;
                } else {
                    bBufferingStructureDone = true;
                }

                // sBufferedValue += sChar;
                if (sBufferedValue === null) {
                    sBufferedValue = sChar;
                } else {
                    sBufferedValue += sChar;
                }
            }

            // Is a colon (default value separator) : end of key
            else if (sChar === $sValueSeparator && !(bComposingQuoteString && bBackslashUp) && !(bBufferingStructure ^ bBufferingStructureDone)) {
                // If value separator found, value is set at least to empty
                sBufferedValue = '';
                bKeySetUp = true;
            }

            // Is a comma (default param separator) : End of pair key:value
            else if (sChar === $sParamSeparator && !(bComposingQuoteString && bBackslashUp)) {
                if (!(bBufferingStructure ^ bBufferingStructureDone)) {
                    if (bKeySetUp) {
                        oObject[sBufferedKey] = sBufferedValue;
                    } else {
                        if (bBufferingStructure && bBufferingStructureDone) {
                            let nIndex = 0;
                            while (oObject.hasOwnProperty(nIndex)) {
                                nIndex++;
                            }
                            oObject[nIndex] = sBufferedValue;
                        } else {
                            oObject[sBufferedKey] = sBufferedValue;
                        }
                    }

                    bKeySetUp = false;
                    sBufferedKey = '';
                    sBufferedValue = null;
                    // sBufferedValue = '';
                    bBufferingStructure = false;
                    bBufferingStructureDone = false;
                } else if (bBufferingStructure && !bBufferingStructureDone) {
                    // sBufferedValue += sChar;

                    if (sBufferedValue === null) {
                        sBufferedValue = sChar;
                    } else {
                        sBufferedValue += sChar;
                    }
                }
            }

            // Is a backslash
            else if (sChar === '\\' && !bBackslashUp) {
                // console.log('BackSlash \ ');
                //bBackslashUp = true;
            }

            // Is a quote char
            else if ((sChar === "'" || sChar === '"') && !bBackslashUp && !(bBufferingStructure ^ bBufferingStructureDone)) {
                // If Quote char already found, turn off the flag
                // If Quote char not found yet, turn on the flag
                bComposingQuoteString = !bComposingQuoteString;
            }

            // Else, collect char
            else {
                if ((bBufferingStructure ^ bBufferingStructureDone)) {
                    // sBufferedValue += sChar;

                    if (sBufferedValue === null) {
                        sBufferedValue = sChar;
                    } else {
                        sBufferedValue += sChar;
                    }
                } else {
                    if (!bKeySetUp) {
                        sBufferedKey += sChar;
                    } else {
                        // sBufferedValue += sChar;

                        if (sBufferedValue === null) {
                            sBufferedValue = sChar;
                        } else {
                            sBufferedValue += sChar;
                        }
                    }
                }
            }
        }

        // Append last "key: value"
        if (sBufferedKey || sBufferedValue) {
            if (sBufferedKey) {
                oObject[sBufferedKey] = sBufferedValue;
            }

            if (!sBufferedKey && sBufferedValue) {
                let nIndex = 0;
                while (oObject.hasOwnProperty(nIndex)) {
                    nIndex++;
                }
                oObject[nIndex] = sBufferedValue;
            }
        }



        /**
         * ----------------------------------------------------------------
         *  Step 2 : Process value (recursive part)
         * ----------------------------------------------------------------
         *
         */
        for (let sKey in oObject) {
            if(!oObject.hasOwnProperty(sKey)) continue;

            let sString = oObject[sKey];

            // Process recursively string which look like to a sub structure
            if (/(\(.+\))/.test(sString)) {
                let aSplit = sString.split(/(\(.+\))/);
                let preVal = aSplit[0];
                let postVal = aSplit[2];
                let oSubObject = ParenthesisParser.parse(aSplit[1], $sParamSeparator, $sValueSeparator);

                oObject[sKey] = Object.assign(Object.defineProperties(
                    {}, {
                        preVal: {
                            enumerable: false,
                            writable: true,
                            value: preVal
                        },
                        postVal: {
                            enumerable: false,
                            writable: true,
                            value: postVal
                        },
                        sourceVal: {
                            enumerable: false,
                            writable: true,
                            value: sString
                        }
                    }
                ), oSubObject);
            }
        }

        Object.defineProperties(oObject, {
            // preVal: {
            //     enumerable: false,
            //     writable: true,
            //     value: preVal
            // },
            // postVal: {
            //     enumerable: false,
            //     writable: true,
            //     value: postVal
            // },
            sourceVal: {
                enumerable: false,
                writable: true,
                value: $sString
            }
        });

        return oObject;
    },

    /**
     * Convert object to string
     *
     * @param {Object} $oObject                 Object to convert into Parenthesis structure in string
     * @param {String} $sParamSeparator         Char separating two parameter (defaut is comma (,))
     * @param {String} $sValueSeparator         Char separating in one param the key with its value (default is a colon (:))
     * @param {Array}  aForbiddenCharInKey      List of regexp where the key must be set between simple quotes
     * @param {Array}  aForbiddenCharInValue    List of regexp where the value must be set between simple quotes
     *
     * @return {string}
     */
    stringify: function ($oObject = {}, $sParamSeparator = ',', $sValueSeparator = ':', aForbiddenCharInKey = ['[$]+'], aForbiddenCharInValue = []) {
        let sOutputString = '(';
        let bFirstKeyValue = true;
        let bFirstEntry = true;

        for (let sPty in $oObject) {
            if(!$oObject.hasOwnProperty(sPty)) continue;

            let sIntermediateString = '';
            let sKey = sPty;
            let sValue = $oObject[sPty];

            // Escape key for specific char
            if (aForbiddenCharInKey.length) {
                // let sEscapeRegExpForKey = aForbiddenCharInKey.join('');
                let sEscapeRegExpForKey = aForbiddenCharInKey.join('|');
                // let oEscapeRegExpForKey = new RegExp(`[${sEscapeRegExpForKey}]+`, 'g');
                let oEscapeRegExpForKey = new RegExp(`${sEscapeRegExpForKey}`, 'g');
                if (oEscapeRegExpForKey.test(sPty)) {
                    sKey = `'${sKey}'`;
                }
            }


            // The only specific treatment must be done for object (sub structure)
            // Other are simple value (Array does not exist here)
            if (Object.prototype.toString.call(sValue) === '[object Object]') {
                // If it's numeric property, it's stand for an index
                if (/^[0-9]+$/.test(sPty)) {
                    if (bFirstEntry) {
                        bFirstEntry = false;
                    } else {
                        sIntermediateString += ',';
                    }
                } else {
                    sIntermediateString = `${(bFirstKeyValue)?'':','}${sKey}${$sValueSeparator}`;
                }


                // Add preValue
                if (sValue.preVal) sIntermediateString += sValue.preVal;

                // Transform object to string
                sIntermediateString += ParenthesisParser.stringify(sValue, $sParamSeparator, $sValueSeparator, aForbiddenCharInKey, aForbiddenCharInValue);

                // Append postValue
                if (sValue.postVal) sIntermediateString += sValue.postVal;

            } else {
                if (sValue === null) {
                    sIntermediateString = `${(bFirstKeyValue)?'':','}${sKey}`;
                } else if (sValue === '') {
                    sValue = "''";
                    sIntermediateString = `${(bFirstKeyValue)?'':','}${sKey}${$sValueSeparator}${sValue}`;
                } else {
                    // Escape value for specific char
                    if (aForbiddenCharInValue.length) {
                        // let sCharList = aForbiddenCharInKey.join('');
                        let sEscapeRegExpForValue = aForbiddenCharInValue.join('|');
                        let oEscapeRegExpForValue = new RegExp(`${sEscapeRegExpForValue}`, 'g');
                        if (oEscapeRegExpForValue.test(sValue)) {
                            sValue = `'${sValue}'`;
                        }
                    }

                    sIntermediateString = `${(bFirstKeyValue)?'':','}${sKey}${$sValueSeparator}${sValue}`;
                }
            }

            sOutputString += sIntermediateString;

            bFirstKeyValue = false;
        }

        sOutputString += ')';

        return sOutputString;
    }
};