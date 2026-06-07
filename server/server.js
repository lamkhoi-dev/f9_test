'use strict';
// LiteSpeed/Passenger CJS wrapper — delegates to TypeScript compiled output.
// LiteSpeed hardcodes looking for server.js but the actual app is compiled TypeScript.
// DO NOT delete or convert this file to ESM — LiteSpeed will break.
require('./dist/server.js');
