function parenthesisParser($sString, $oObjectReceiver = {}, $sParamSeparator = ',', $sValueSeparator = ':', ) {
    let oObject = {};

    console.log("BEGIN PARSER");
    console.log('--- Provided string : ', $sString);
    console.log('--- Provided receiver : ', $oObjectReceiver);
    console.log("\n");

    /**
     * ----------------------------------------------------------------
     *  Step 1 : Search for pair : key : value
     * ----------------------------------------------------------------
     */
    let bKeySetUp = false;                  // When : is found, key is set up
    let bBackslashUp = false;               // A backslash is found
    let bComposingQuoteString = false;      // Disable check for specific char
    let bBufferingStructure = false;        // If an opening ( is found
    let bBufferingStructureDone = false;
    let bBufferingReset = false;
    let nOpeningParenthesisCrossed = 0;     // Count ( crossed to find appropriate closing one
    let sBufferedKey = '';
    let sBufferedValue = '';
    let sBufferedPreValue = '';
    let sBufferedPostValue = '';
    let sBufferedSubStructure = '';

    let oObjectDefinition = {
        "@pP_name": "",
        "@pP_type": "value",
        "@pP_preVal": '',
        "@pP_postVal": '',
        "@pP_fullVal": '',
        "@pP_values": []
    };

    // Start from 1, because first char is (
    // Finished to length -1, because last char is )
    for (let i = 1; i < $sString.length - 1; i++) {
        let sChar = $sString[i];

        // Store Value from $sValueSeparator
        // if (bKeySetUp && sChar !== $sValueSeparator) {
        if (bKeySetUp) {
            sBufferedValue += sChar;
        }

        // Is an opening parenthesis
        if (sChar === '(' && !(bComposingQuoteString && bBackslashUp)) {
            if (!bBufferingStructure) {
                bBufferingStructure = true;
            } else {
                nOpeningParenthesisCrossed++;
            }

            sBufferedSubStructure += sChar;
        }

        // Is a closing parenthesis
        else if (sChar === ')' && bBufferingStructure && !(bComposingQuoteString && bBackslashUp)) {
            sBufferedSubStructure += sChar;

            if (nOpeningParenthesisCrossed) {
                nOpeningParenthesisCrossed--;
            } else {
                console.log("--- Recursive Call for '" + sBufferedKey + "' with :", sBufferedSubStructure);

                // For multiple value, it possible not having key, that meaning
                // an array is expected.
                if (!sBufferedKey) {
                    console.log("--- --- Key is empty --> Multiple value (array)");
                    console.log("\n");

                    let oObjectDef = Object.assign(oObjectDefinition,  {
                        '@pP_name': $oObjectReceiver['@pP_values'].length,
                        '@pP_type': 'object'
                    });
                    let oObjectTmp = Object.assign({}, oObjectDef);
                    $oObjectReceiver['@pP_type'] = 'array';
                    parenthesisParser(sBufferedSubStructure, oObjectTmp, $sParamSeparator, $sValueSeparator);
                    $oObjectReceiver['@pP_values'].push(Object.assign({}, oObjectTmp));

                } else {
                    console.log("--- --- Key is up --> receive properties");
                    console.log("\n");

                    // oObject[sBufferedKey]['@pP_type'] = 'object';
                    // oObject[sBufferedKey]['@pP_name'] = sBufferedKey;

                    oSubObject[sBufferedKey]['@pP_type'] = 'object';
                    oSubObject[sBufferedKey]['@pP_name'] = sBufferedKey;

                    parenthesisParser(sBufferedSubStructure, oSubObject[sBufferedKey], $sParamSeparator, $sValueSeparator );
                }

                bBufferingStructureDone = true; // Flag for preValue / postValue
            }
        }

        // Is a colon (default value separator) : end of key
        else if (sChar === $sValueSeparator && !(bComposingQuoteString && bBackslashUp) && !(bBufferingStructure ^ bBufferingStructureDone)) {
            bKeySetUp = true;
            // oObject[sBufferedKey] = Object.assign({}, oObjectDefinition);
            oSubObject[sBufferedKey] = Object.assign({}, oObjectDefinition);
        }

        // Is a comma (default param separator) : End of pair key:value
        // else if (sChar === $sParamSeparator && !(bComposingQuoteString && bBackslashUp) && !(bBufferingStructure ^ bBufferingStructureDone)) {
        else if (sChar === $sParamSeparator && !(bComposingQuoteString && bBackslashUp) && !(bBufferingStructure ^ bBufferingStructureDone)) {
            if (bBufferingStructure) {
                // reset to allow a new recursive call
                sBufferedSubStructure = '';
                bBufferingStructure = false;
                bBufferingStructureDone = false;
                bBufferingReset = true;
            }

            // Default mode when comma it at the end :
            if (!bBufferingStructure) {
                // if (!bBufferingStructure || (bBufferingStructure && ($oObjectReceiver['@pP_type'] !== 'array'))) {
                if (sBufferedKey) {
                    // Object.assign(oObject[sBufferedKey], {
                    //     "@pP_name": sBufferedKey,
                    //     "@pP_preVal": sBufferedPreValue,
                    //     "@pP_postVal": sBufferedPostValue,
                    //     "@pP_fullVal": sBufferedValue
                    // });
                    Object.assign(oSubObject[sBufferedKey], {
                        "@pP_name": sBufferedKey,
                        "@pP_preVal": sBufferedPreValue,
                        "@pP_postVal": sBufferedPostValue,
                        "@pP_fullVal": sBufferedValue
                    });

                    // Reset Flags
                    bKeySetUp = false;
                    bBackslashUp = false;           // Must not be up at this moment
                    bComposingQuoteString = false;  // Must not be up at this moment
                    bBufferingStructure = false;
                    bBufferingStructureDone = false;
                    nOpeningParenthesisCrossed = 0;
                    sBufferedKey = '';
                    sBufferedValue = '';
                    sBufferedPreValue = '';
                    sBufferedPostValue = '';
                    sBufferedSubStructure = '';
                }
            }

            // When buffered structure, that mean recursive call have been done
            else {
            }
        }

        // Is a backslash
        else if (sChar === '\\' && !bBackslashUp) {
            // console.log('BackSlash \ ');
            //bBackslashUp = true;
        }

        // Is a quote char
        else if ((sChar === "'" || sChar === '"') && !bBackslashUp && !(bBufferingStructure ^ bBufferingStructureDone)) {
            // console.log('Quote char ' + sChar);
            // If Quote char already found, turn off the flag
            // If Quote char not found yet, turn on the flag
            bComposingQuoteString = !bComposingQuoteString;
        }

        // Else, collect char
        else {
            // console.log('Else');
            // Buffering char for sub structure for recursive call has the priority
            if (bBufferingStructure && !bBufferingStructureDone) {
                sBufferedSubStructure += sChar
            }
            // Else case
            else {
                // While Key not setup, collect char to compose it
                if (!bKeySetUp) {
                    sBufferedKey += sChar;
                }
                // Else store char in the appropriate buffer
                else {
                    if (bBufferingStructureDone) {
                        sBufferedPostValue += sChar;
                    } else {
                        sBufferedPreValue += sChar;
                    }
                }
            }

            // if (!bKeySetUp) {
            //     sBufferedKey += sChar;
            // } else {
            //     if (bBufferingStructure && !bBufferingStructureDone) {
            //         sBufferedSubStructure += sChar
            //     } else {
            //         if (bBufferingStructureDone) {
            //             sBufferedPostValue += sChar;
            //         } else {
            //             sBufferedPreValue += sChar;
            //         }
            //     }
            // }
        }

        // Always update oObject (break reference)
        oObject = Object.assign({}, oSubObject);
    }

    // Last couple "key: pair" is not appended
    // if not empty, append it
    if (sBufferedKey) {
        console.log('--- Last store for', sBufferedKey, 'with', sBufferedValue);
        if (oObject[sBufferedKey]) {
            oObject[sBufferedKey] = Object.assign(oObject[sBufferedKey], {
                "@pP_preVal": sBufferedPreValue,
                "@pP_postVal": sBufferedPostValue,
                "@pP_fullVal": sBufferedValue
            });
        } else {
            oObject[sBufferedKey] = Object.assign(oObjectDefinition, {
                "@pP_preVal": sBufferedPreValue,
                "@pP_postVal": sBufferedPostValue,
                "@pP_fullVal": sBufferedValue
            });
        }

        $oObjectReceiver = Object.assign($oObjectReceiver, oObject);

        if (sBufferedSubStructure) {
            // console.log("• Recursive Call for " + sBufferedKey + " :\n");
            // parenthesisParser(sBufferedSubStructure, oObject[sBufferedKey], $sParamSeparator, $sValueSeparator);
        }

        // console.log(`---[ ${sBufferedKey} ]-------------------------------` + "\n");
        // Do not care about flags and variable,
        // They must not used in the second step
    }

    // if (bBufferingStructure && bBufferingStructureDone) {
    //
    // }



    // Step 2 : Parse the value


    // // Final step
    // if ($oObjectReceiver['@pP_type'] === 'array') {
    //     $oObjectReceiver['@pP_values'].push();
    //     console.log("--- returning: ", $oObjectReceiver);
    //     console.log("END_PARSER");
    //     console.log("*******************************************************************************");
    //     console.log("\n");
    //     // return $oObjectReceiver;
    // } else {
    //     console.log("--- returning: ", Object.assign($oObjectReceiver, oObject));
    //     console.log("END_PARSER");
    //     console.log("*******************************************************************************");
    //     console.log("\n");
    //     $oObjectReceiver = Object.assign($oObjectReceiver, oObject);
    //     // return Object.assign($oObjectReceiver, oObject);
    // }
}