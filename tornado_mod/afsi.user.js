// ==UserScript==
// @name         AFS Improvements(AFSI)
// @description  Changes to make geofs better.
// @version      1.3
// @author       jazzyrazzy3026
// @match        https://www.geo-fs.com/geofs.php?*
// @connect      github.com
// @connect      raw.githubusercontent.com
// @downloadURL  https://raw.githubusercontent.com/jazzyrazzy3026/AFSI/main/afsi.user.js
// @updateURL    https://raw.githubusercontent.com/jazzyrazzy3026/AFSI/main/afsi.user.js
// @run-at       document-start
// @grant        none
//
// === AUTOMATIC MODULE DOWNLOAD ===
// @require      https://raw.githubusercontent.com/jazzyrazzy3026/AFSI/main/particle.module.js
// =================================
// ==/UserScript==

(function() {
    'use strict';

    // 1. Mod State Configuration
    const STATE = {
        enabled: true,
        spawnChance: 100, // Percentage (0 - 100)
        activeTornado: null,
        radiusKM: 2.5,
        physicsInterval: 30
    };

    // 2. Wait for GeoFS UI and external module to load
    function checkEnvironment() {
        const geofsReady = typeof geofs !== 'undefined' && geofs.animation && geofs.api && geofs.animation.values;
        const bodyReady = document.body !== null;

        if (geofsReady && bodyReady) {
            console.log("✅ [AFSI] GeoFS Environment ready. Injected UI and starting core listeners.");
            createMenu();
            
            // Try an initial roll to see if a tornado spawns right away based on the slider percentage
            attemptAutoSpawn();
            
            // Start physics cycle
            setInterval(runSimulationLoop, STATE.physicsInterval);
        } else {
            setTimeout(checkEnvironment, 250);
        }
    }

    // 3. Create the Floating "Tornado Mod" Menu UI
    function createMenu() {
        // Prevent duplicate menus if script updates
        if (document.getElementById('afsi-tornado-menu')) return;

        const menu = document.createElement('div');
        menu.id = 'afsi-tornado-menu';
        menu.style = `
            position: absolute;
            top: 60px;
            right: 20px;
            width: 240px;
            background: rgba(30, 30, 30, 0.85);
            color: #fff;
            font-family: sans-serif;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            z-index: 10000;
            border: 1px solid #444;
            user-select: none;
        `;

        menu.innerHTML = `
            <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #555; padding-bottom: 5px; color: #ff4a4a; display: flex; justify-content: space-between;">
                🌪️ Tornado Mod <span>v1.3</span>
            </h3>
            
            <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 13px; cursor: pointer;" for="tornado-toggle">Enable Mod:</label>
                <input type="checkbox" id="tornado-toggle" ${STATE.enabled ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
            </div>

            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px;">
                    <span>Spawn Chance:</span>
                    <span id="chance-val" style="font-weight: bold; color: #00ffcc;">${STATE.spawnChance}%</span>
                </div>
                <input type="range" id="tornado-chance" min="0" max="100" value="${STATE.spawnChance}" style="width: 100%; cursor: pointer;">
            </div>

            <button id="spawn-now-btn" style="width: 100%; background: #ff4a4a; border: none; color: white; padding: 8px; font-weight: bold; border-radius: 4px; cursor: pointer; transition: 0.2s;">
                ⚡ Force Spawn Tornado
            </button>
            <div id="status-text" style="font-size: 11px; color: #aaa; text-align: center; margin-top: 8px;">Waiting for action...</div>
        `;

        document.body.appendChild(menu);

        // --- UI EVENT LISTENERS ---
        const toggleCheckbox = document.getElementById('tornado-toggle');
        const chanceSlider = document.getElementById('tornado-chance');
        const chanceVal = document.getElementById('chance-val');
        const forceBtn = document.getElementById('spawn-now-btn');
        const statusText = document.getElementById('status-text');

        // Toggle Mod On/Off
        toggleCheckbox.addEventListener('change', (e) => {
            STATE.enabled = e.target.checked;
            statusText.innerText = STATE.enabled ? "Mod enabled." : "Mod disabled. Tornado cleared.";
            if (!STATE.enabled) {
                clearExistingTornado();
            }
        });

        // Chance Slider Controller
        chanceSlider.addEventListener('input', (e) => {
            STATE.spawnChance = parseInt(e.target.value);
            chanceVal.innerText = `${STATE.spawnChance}%`;
        });

        // Manual Spawn Button
        forceBtn.addEventListener('click', () => {
            if (!STATE.enabled) {
                statusText.innerText = "Error: Enable the mod first!";
                return;
            }
            spawnInFrontOfPlayer();
            statusText.innerText = "Tornado forced onto runway!";
        });
        
        // Hover effects for the button
        forceBtn.addEventListener('mouseover', () => forceBtn.style.background = '#e03b3b');
        forceBtn.addEventListener('mouseout', () => forceBtn.style.background = '#ff4a4a');
    }

    // 4. Algorithm to drop the storm coordinates right in front of the nose cone
    function spawnInFrontOfPlayer() {
        if (!geofs.animation.values || geofs.animation.values.lat === 0) return;

        clearExistingTornado();

        let spawnLat = geofs.animation.values.lat;
        let spawnLon = geofs.animation.values.lon;
        let heading = geofs.animation.values.heading || 0;

        let headingRad = heading * Math.PI / 180;
        
        // Setup coordinates
        STATE.activeTornado = {
            lat: spawnLat + (Math.cos(headingRad) * 0.02),
            lon: spawnLon + (Math.sin(headingRad) * 0.02)
        };

        console.log(`🌪️ Spawned at Lat: ${STATE.activeTornado.lat}, Lon: ${STATE.activeTornado.lon}`);

        // Safe-call visual generator from module if loaded, otherwise falls back smoothly
        if (window.AFSITornadoEngine && typeof window.AFSITornadoEngine.spawnVisualVortex === 'function') {
            try {
                window.AFSITornadoEngine.spawnVisualVortex(geofs.api.viewer, STATE.activeTornado.lat, STATE.activeTornado.lon, STATE.radiusKM);
            } catch (e) {
                console.error("Module rendering failed:", e);
            }
        }
    }

    function attemptAutoSpawn() {
        // Roll dice between 1 and 100. If lower than your setting, auto spawn on load
        let roll = Math.floor(Math.random() * 100) + 1;
        if (roll <= STATE.spawnChance && STATE.enabled) {
            setTimeout(spawnInFrontOfPlayer, 2000); // Wait 2 seconds after initialization to drop it safely
        }
    }

    function clearExistingTornado() {
        STATE.activeTornado = null;
        // Clean up Cesium visual primitive if attached to the module
        if (window.AFSITornadoEngine && window.AFSITornadoEngine.particleSystem) {
            try {
                geofs.api.viewer.scene.primitives.remove(window.AFSITornadoEngine.particleSystem);
                window.AFSITornadoEngine.particleSystem = null;
            } catch(e){}
        }
    }

    // 5. Physics evaluation Loop
    function runSimulationLoop() {
        if (!STATE.enabled || !STATE.activeTornado || !geofs.animation.values) return;

        const planeLat = geofs.animation.values.lat;
        const planeLon = geofs.animation.values.lon;

        // Use fallback math if the module distance function fails to fetch
        let distance;
        if (window.AFSITornadoEngine && typeof window.AFSITornadoEngine.getDistanceKM === 'function') {
            distance = window.AFSITornadoEngine.getDistanceKM(planeLat, planeLon, STATE.activeTornado.lat, STATE.activeTornado.lon);
        } else {
            // Local pure JS Distance Formula fallback
            const R = 6371;
            const dLat = (STATE.activeTornado.lat - planeLat) * Math.PI / 180;
            const dLon = (STATE.activeTornado.lon - planeLon) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(planeLat * Math.PI / 180) * Math.cos(STATE.activeTornado.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
            distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        }

        if (distance < STATE.radiusKM) {
            const intensity = 1 - (distance / STATE.radiusKM);
            
            // Violent flight instabilities
            geofs.animation.values.roll += (Math.random() - 0.5) * 45 * intensity;
            geofs.animation.values.pitch += (Math.random() - 0.5) * 25 * intensity;

            if (geofs.aircraft && geofs.aircraft.instance) {
                geofs.aircraft.instance.velocity[2] += 55 * intensity; // Direct thermal core vacuum force
            }
        }
    }

    // Run core engine checker
    checkEnvironment();
})();
