/**
 * Extend Object to offer a assignDeep method
 *
 * Author        : Nicolas DUPRE
 * Sources       : object-assign-deep
 * URL           : https://www.npmjs.com/package/object-assign-deep
 * Orig. Version : v0.4.0
 *
 * Comment : I simply rearrange methods & implementation to extend Object
 */
function ObjectAssignDeep ($bMerge = false){
    let self = this;

    self.cloneValue = function (value) {
        // The value is an object so lets clone it.
        if (self.getTypeOf(value) === 'object') {
            return self.quickCloneObject(value);
        }

        // The value is an array so lets clone it.
        else if (self.getTypeOf(value) === 'array') {
            return self.quickCloneArray(value);
        }

        // Any other value can just be copied.
        return value;
    };

    self.quickCloneArray = function (input) {
        return input.map(self.cloneValue);
    };

    self.quickCloneObject = function (input) {
        const output = {};

        for (const key in input) {
            if (!input.hasOwnProperty(key)) { continue; }

            output[key] = self.cloneValue(input[key]);
        }

        return output;
    };

    self.getTypeOf = function (input) {
        if (input === null) {
            return 'null';
        }

        else if (typeof input === 'undefined') {
            return 'undefined';
        }

        else if (typeof input === 'object') {
            return (Array.isArray(input) ? 'array' : 'object');
        }

        return typeof input;
    };

    self.executeDeepMerge = function (target, _objects = [], _options = {}) {
        const options = {
            arrayBehaviour: _options.arrayBehaviour || 'replace',  // Can be "merge" or "replace".
        };

        // debugger;

        // Ensure we have actual objects for each.
        const objects = _objects.map(object => object || {});
        const output = target || {};

        // Enumerate the objects and their keys.
        for (let oindex = 0; oindex < objects.length; oindex++) {
            const object = objects[oindex];
            const keys = Object.keys(object);

            for (let kindex = 0; kindex < keys.length; kindex++) {
                const key = keys[kindex];
                const value = object[key];
                const type = self.getTypeOf(value);
                const existingValueType = self.getTypeOf(output[key]);

                if (type === 'object') {
                    if (existingValueType !== 'undefined') {
                        const existingValue = (existingValueType === 'object' ? output[key] : {});
                        output[key] = self.executeDeepMerge({}, [existingValue, self.quickCloneObject(value)], options);
                    }
                    else {
                        output[key] = self.quickCloneObject(value);
                    }
                }

                else if (type === 'array') {
                    if (existingValueType === 'array') {
                        const newValue = self.quickCloneArray(value);
                        output[key] = (options.arrayBehaviour === 'merge' ? output[key].concat(newValue) : newValue);
                    }
                    else {
                        output[key] = self.quickCloneArray(value);
                    }
                }

                else {
                    output[key] = value;
                }

            }
        }

        return output;
    };

    self.objectAssignDeep = function($target, ...$objects){
        return self.executeDeepMerge($target, $objects);
    };

    self.objectAssignDeepMerge = function($target, ...$objects){
        return self.executeDeepMerge($target, $objects, {arrayBehaviour: 'merge'});
    }

    if($bMerge){
        return self.objectAssignDeepMerge;
    } else {
        return self.objectAssignDeep;
    }
}

// Using .prototype will break component loading...
// I suppose it's due to enumerate the new property
// By defineProperties, we set the new method as no unemrable
Object.defineProperties(Object, {
    assignDeep: {
        enumerable: false,
        writable: false,
        value: new ObjectAssignDeep()
    },

    assignDeepMerge: {
        enumerable: false,
        writable: false,
        value: new ObjectAssignDeep(true)
    }
});
