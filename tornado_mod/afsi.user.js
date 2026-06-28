// ==UserScript==
// @name         AFS Improvements(AFSI)
// @description  Changes to make geofs better.
// @version      1.5
// @author       jazzyrazzy3026
// @match        https://*.geo-fs.com/geofs.php*
// @match        https://geo-fs.com/geofs.php*
// @match        http://*.geo-fs.com/geofs.php*
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

    console.log("⚡ [AFSI] Core injected at document-start. Awaiting interface elements...");

    const STATE = {
        enabled: true,
        spawnChance: 100,
        activeTornado: null,
        radiusKM: 2.5,
        physicsInterval: 30
    };

    // Use a MutationObserver to watch for the exact moment the GeoFS game layout loads
    const observer = new MutationObserver((mutations, obs) => {
        const uiContainer = document.querySelector('.geofs-ui-left') || document.body;
        if (uiContainer) {
            console.log("🖥️ [AFSI] Target UI container found. Inserting menu.");
            createMenu(uiContainer);
            obs.disconnect(); // Stop watching once the menu is built
            
            // Begin testing for physics readiness loop
            checkPhysicsReady();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    function createMenu(parent) {
        if (document.getElementById('afsi-tornado-menu')) return;

        const menu = document.createElement('div');
        menu.id = 'afsi-tornado-menu';
        // Changed layout parameters to use fixed positioning with full visibility properties
        menu.style.cssText = `
            position: fixed !important;
            top: 80px !important;
            right: 20px !important;
            width: 240px !important;
            background: rgb(25, 25, 25) !important;
            color: #ffffff !important;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
            padding: 15px !important;
            border-radius: 6px !important;
            box-shadow: 0px 10px 25px rgba(0,0,0,0.8) !important;
            z-index: 999999 !important;
            border: 2px solid #ff4a4a !important;
            visibility: visible !important;
            display: block !important;
        `;

        menu.innerHTML = `
            <h3 style="margin: 0 0 10px 0; font-size: 15px; border-bottom: 1px solid #444; padding-bottom: 6px; color: #ff4a4a; font-weight: bold;">
                🌪️ Tornado Mod (AFSI)
            </h3>
            
            <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 12px; color: #eee;" for="tornado-toggle">Active System:</label>
                <input type="checkbox" id="tornado-toggle" ${STATE.enabled ? 'checked' : ''} style="width: 15px; height: 15px;">
            </div>

            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; color: #eee;">
                    <span>Spawn Probability:</span>
                    <span id="chance-val" style="font-weight: bold; color: #00ffcc;">${STATE.spawnChance}%</span>
                </div>
                <input type="range" id="tornado-chance" min="0" max="100" value="${STATE.spawnChance}" style="width: 100%;">
            </div>

            <button id="spawn-now-btn" style="width: 100%; background: #ff4a4a; border: none; color: white; padding: 8px; font-weight: bold; border-radius: 4px; cursor: pointer; font-size: 12px;">
                ⚡ Force Spawn Tornado
            </button>
            <div id="status-text" style="font-size: 10px; color: #ffbcbc; text-align: center; margin-top: 8px;">Interface Online</div>
        `;

        parent.appendChild(menu);

        // Bind interactive events
        document.getElementById('tornado-toggle').addEventListener('change', (e) => {
            STATE.enabled = e.target.checked;
            document.getElementById('status-text').innerText = STATE.enabled ? "System armed." : "System disabled.";
            if (!STATE.enabled) clearExistingTornado();
        });

        document.getElementById('tornado-chance').addEventListener('input', (e) => {
            STATE.spawnChance = parseInt(e.target.value);
            document.getElementById('chance-val').innerText = `${STATE.spawnChance}%`;
        });

        document.getElementById('spawn-now-btn').addEventListener('click', () => {
            if (!STATE.enabled) {
                document.getElementById('status-text').innerText = "Enable the system first!";
                return;
            }
            spawnInFrontOfPlayer();
            document.getElementById('status-text').innerText = "Vortex set ahead!";
        });
    }

    function checkPhysicsReady() {
        const geofsReady = typeof geofs !== 'undefined' && geofs.animation && geofs.api && geofs.animation.values;
        if (geofsReady && geofs.animation.values.lat !== 0) {
            console.log("✅ [AFSI] Telemetry systems connected. Physics loop engine engaged.");
            
            // Run automatic randomizer roll
            let roll = Math.floor(Math.random() * 100) + 1;
            if (roll <= STATE.spawnChance && STATE.enabled) {
                setTimeout(spawnInFrontOfPlayer, 3000); 
            }

            setInterval(runSimulationLoop, STATE.physicsInterval);
        } else {
            setTimeout(checkPhysicsReady, 250);
        }
    }

    function spawnInFrontOfPlayer() {
        if (!geofs.animation.values) return;

        clearExistingTornado();

        let spawnLat = geofs.animation.values.lat;
        let spawnLon = geofs.animation.values.lon;
        let heading = geofs.animation.values.heading || 0;
        let headingRad = heading * Math.PI / 180;
        
        STATE.activeTornado = {
            lat: spawnLat + (Math.cos(headingRad) * 0.02),
            lon: spawnLon + (Math.sin(headingRad) * 0.02)
        };

        if (window.AFSITornadoEngine && typeof window.AFSITornadoEngine.spawnVisualVortex === 'function') {
            try {
                window.AFSITornadoEngine.spawnVisualVortex(geofs.api.viewer, STATE.activeTornado.lat, STATE.activeTornado.lon, STATE.radiusKM);
            } catch (e) {
                console.error("Visual compilation error:", e);
            }
        }
    }

    function clearExistingTornado() {
        STATE.activeTornado = null;
        if (window.AFSITornadoEngine && window.AFSITornadoEngine.particleSystem) {
            try {
                geofs.api.viewer.scene.primitives.remove(window.AFSITornadoEngine.particleSystem);
                window.AFSITornadoEngine.particleSystem = null;
            } catch(e){}
        }
    }

    function runSimulationLoop() {
        if (!STATE.enabled || !STATE.activeTornado || !geofs.animation.values) return;

        const planeLat = geofs.animation.values.lat;
        const planeLon = geofs.animation.values.lon;

        let distance;
        if (window.AFSITornadoEngine && typeof window.AFSITornadoEngine.getDistanceKM === 'function') {
            distance = window.AFSITornadoEngine.getDistanceKM(planeLat, planeLon, STATE.activeTornado.lat, STATE.activeTornado.lon);
        } else {
            const R = 6371;
            const dLat = (STATE.activeTornado.lat - planeLat) * Math.PI / 180;
            const dLon = (STATE.activeTornado.lon - planeLon) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(planeLat * Math.PI / 180) * Math.cos(STATE.activeTornado.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
            distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        }

        if (distance < STATE.radiusKM) {
            const intensity = 1 - (distance / STATE.radiusKM);
            geofs.animation.values.roll += (Math.random() - 0.5) * 45 * intensity;
            geofs.animation.values.pitch += (Math.random() - 0.5) * 25 * intensity;

            if (geofs.aircraft && geofs.aircraft.instance) {
                geofs.aircraft.instance.velocity[2] += 55 * intensity;
            }
        }
    }
})();
