/* @ts-self-types="./mako_sgp4_wasm.d.ts" */

/**
 * SGP4 propagator for a single satellite
 *
 * Wraps an initialized [`Sgp4`] model for use from JavaScript. All times are minutes since
 * the element set epoch, and all positions are in kilometers.
 *
 * # Examples
 * ```rust
 * use mako_sgp4_wasm::Satellite;
 *
 * // Parse a TLE
 * let tle = "\
 * ISS (ZARYA)
 * 1 25544U 98067A   08264.51782528 -.00002182 -00100-2 -11606-4 0  2921
 * 2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";
 * let sat = Satellite::new(tle).ok().unwrap();
 *
 * // Propagate one orbit at 1 minute steps
 * let track = sat.track_teme(0.0, 92.0, 1.0);
 * assert_eq!(track.len(), 93 * 3);
 * ```
 */
export class Satellite {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SatelliteFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_satellite_free(ptr, 0);
    }
    /**
     * Deep space flag
     *
     * # Returns
     * * `deep_space` - True if propagated with SDP4 (period of 225 minutes or more)
     * @returns {boolean}
     */
    get deepSpace() {
        const ret = wasm.satellite_deepSpace(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Orbital eccentricity
     *
     * # Returns
     * * `eccentricity` - Eccentricity \[\]
     * @returns {number}
     */
    get eccentricity() {
        const ret = wasm.satellite_eccentricity(this.__wbg_ptr);
        return ret;
    }
    /**
     * Element set epoch as Unix time
     *
     * Pass to `new Date()` in JavaScript.
     *
     * # Returns
     * * `epoch_unix_ms` - Milliseconds since 1970-01-01 00:00:00 UTC \[ms\]
     * @returns {number}
     */
    get epochUnixMs() {
        const ret = wasm.satellite_epochUnixMs(this.__wbg_ptr);
        return ret;
    }
    /**
     * Greenwich mean sidereal time (GMST)
     *
     * Rotate an Earth model by this angle about its polar axis to align it with the TEME frame.
     *
     * # Arguments
     * * `t` - Minutes since epoch \[min\]
     *
     * # Returns
     * * `theta_g` - GMST \[rad\], wrapped to \[0, 2 * pi)
     *
     * # Examples
     * ```rust
     * use std::f64::consts::PI;
     * use mako_sgp4_wasm::Satellite;
     *
     * // Parse a TLE
     * let tle = "\
     * 1 25544U 98067A   08264.51782528 -.00002182 -00100-2 -11606-4 0  2921
     * 2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";
     * let sat = Satellite::new(tle).ok().unwrap();
     *
     * // GMST is always within one revolution
     * let theta_g = sat.gmst(0.0);
     * assert!((0.0..2.0 * PI).contains(&theta_g));
     * ```
     * @param {number} t
     * @returns {number}
     */
    gmst(t) {
        const ret = wasm.satellite_gmst(this.__wbg_ptr, t);
        return ret;
    }
    /**
     * Orbital inclination
     *
     * # Returns
     * * `inclination` - Inclination \[deg\]
     * @returns {number}
     */
    get inclination() {
        const ret = wasm.satellite_inclination(this.__wbg_ptr);
        return ret;
    }
    /**
     * Convert Unix time to minutes since epoch
     *
     * # Arguments
     * * `unix_ms` - Milliseconds since 1970-01-01 00:00:00 UTC, e.g. `Date.now()` \[ms\]
     *
     * # Returns
     * * `t` - Minutes since epoch \[min\]
     *
     * # Examples
     * ```rust
     * use mako_sgp4_wasm::Satellite;
     *
     * // Parse a TLE
     * let tle = "\
     * 1 25544U 98067A   08264.51782528 -.00002182 -00100-2 -11606-4 0  2921
     * 2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";
     * let sat = Satellite::new(tle).ok().unwrap();
     *
     * // One hour after epoch is 60 minutes
     * let t = sat.minutes_since_epoch(sat.epoch_unix_ms() + 3_600_000.0);
     * assert!((t - 60.0).abs() < 1e-6);
     * ```
     * @param {number} unix_ms
     * @returns {number}
     */
    minutesSinceEpoch(unix_ms) {
        const ret = wasm.satellite_minutesSinceEpoch(this.__wbg_ptr, unix_ms);
        return ret;
    }
    /**
     * Object name
     *
     * # Returns
     * * `name` - Object name, or an empty string if none was given
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.satellite_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Parse the first element set in a string
     *
     * Accepts a TLE (2 or 3 lines) or an OMM in KVN format. Text starting with
     * `CCSDS_OMM_VERS` is parsed as OMM KVN, otherwise as TLE.
     *
     * # Arguments
     * * `text` - Element set text
     *
     * # Returns
     * * `Ok(Satellite)` - Initialized propagator for the first element set
     * * `Err(JsError)` - If no element set could be parsed
     *
     * # Errors
     * * If `text` is empty, cannot be parsed, or contains no element sets
     *
     * # Examples
     * ```rust
     * use mako_sgp4_wasm::Satellite;
     *
     * // Parse a TLE without a name line
     * let tle = "\
     * 1 25544U 98067A   08264.51782528 -.00002182 -00100-2 -11606-4 0  2921
     * 2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";
     * let sat = Satellite::new(tle).ok().unwrap();
     * assert_eq!(sat.norad_id(), 25544);
     * ```
     * @param {string} text
     */
    constructor(text) {
        const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.satellite_new(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        SatelliteFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * NORAD satellite catalog number
     *
     * # Returns
     * * `norad_id` - Catalog number
     * @returns {number}
     */
    get noradId() {
        const ret = wasm.satellite_noradId(this.__wbg_ptr);
        return ret;
    }
    /**
     * Orbital period from the element set mean motion
     *
     * # Returns
     * * `period` - Period \[min\]
     * @returns {number}
     */
    get periodMinutes() {
        const ret = wasm.satellite_periodMinutes(this.__wbg_ptr);
        return ret;
    }
    /**
     * Propagate to a single time
     *
     * # Arguments
     * * `t` - Minutes since epoch \[min\]
     *
     * # Returns
     * * `Ok(state)` - `[x, y, z, vx, vy, vz]` in TEME \[km, km/s\]
     * * `Err(JsError)` - If propagation fails
     *
     * # Errors
     * * If intermediate orbital elements become non-physical (e.g. the satellite decays)
     *
     * # Examples
     * ```rust
     * use mako_sgp4_wasm::Satellite;
     *
     * // Parse a TLE
     * let tle = "\
     * 1 25544U 98067A   08264.51782528 -.00002182 -00100-2 -11606-4 0  2921
     * 2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";
     * let sat = Satellite::new(tle).ok().unwrap();
     *
     * // Propagate to epoch
     * let state = sat.propagate(0.0).ok().unwrap();
     * assert_eq!(state.len(), 6);
     * ```
     * @param {number} t
     * @returns {Float64Array}
     */
    propagate(t) {
        const ret = wasm.satellite_propagate(this.__wbg_ptr, t);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Propagate a geodetic ground track
     *
     * Positions are rotated into an Earth-fixed frame by GMST (neglecting polar motion) and
     * converted to geodetic coordinates on the WGS-84 ellipsoid. Stops early if propagation
     * fails (e.g. the satellite decays) or after 1,000,000 points.
     *
     * # Arguments
     * * `start` - First time, minutes since epoch \[min\]
     * * `end` - Last time, minutes since epoch \[min\]
     * * `step` - Time step \[min\]
     *
     * # Returns
     * * `track` - `[lat0, lon0, alt0, ...]` \[deg, deg, km\], empty if `step` is not positive,
     *   `end` is before `start`, or any input is not finite
     *
     * # Examples
     * ```rust
     * use mako_sgp4_wasm::Satellite;
     *
     * // Parse a TLE
     * let tle = "\
     * 1 25544U 98067A   08264.51782528 -.00002182 -00100-2 -11606-4 0  2921
     * 2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";
     * let sat = Satellite::new(tle).ok().unwrap();
     *
     * // Altitude at epoch is a few hundred kilometers
     * let track = sat.track_geodetic(0.0, 0.0, 1.0);
     * assert!((300.0..450.0).contains(&track[2]));
     * ```
     * @param {number} start
     * @param {number} end
     * @param {number} step
     * @returns {Float64Array}
     */
    trackGeodetic(start, end, step) {
        const ret = wasm.satellite_trackGeodetic(this.__wbg_ptr, start, end, step);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Propagate a TEME position track
     *
     * Stops early if propagation fails (e.g. the satellite decays) or after 1,000,000 points.
     *
     * # Arguments
     * * `start` - First time, minutes since epoch \[min\]
     * * `end` - Last time, minutes since epoch \[min\]
     * * `step` - Time step \[min\]
     *
     * # Returns
     * * `track` - `[x0, y0, z0, x1, y1, z1, ...]` in TEME \[km\], empty if `step` is not positive,
     *   `end` is before `start`, or any input is not finite
     *
     * # Examples
     * ```rust
     * use mako_sgp4_wasm::Satellite;
     *
     * // Parse a TLE
     * let tle = "\
     * 1 25544U 98067A   08264.51782528 -.00002182 -00100-2 -11606-4 0  2921
     * 2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537";
     * let sat = Satellite::new(tle).ok().unwrap();
     *
     * // Propagate 90 minutes at 1 minute steps (91 points)
     * let track = sat.track_teme(0.0, 90.0, 1.0);
     * assert_eq!(track.len(), 91 * 3);
     * ```
     * @param {number} start
     * @param {number} end
     * @param {number} step
     * @returns {Float64Array}
     */
    trackTeme(start, end, step) {
        const ret = wasm.satellite_trackTeme(this.__wbg_ptr, start, end, step);
        var v1 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
}
if (Symbol.dispose) Satellite.prototype[Symbol.dispose] = Satellite.prototype.free;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_30c8987f7c2ed4e2: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./mako_sgp4_wasm_bg.js": import0,
    };
}

const SatelliteFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_satellite_free(ptr, 1));

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('mako_sgp4_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
