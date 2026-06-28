// ==UserScript==
// @name         AFS Improvements(AFSI)
// @description  Changes to make geofs better.
// @version      1.2
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

    // 1. Configuration: Tweak tornado behaviors here
    const CONFIG = {
        tornado: {
            lat: 0,             // Will be dynamically set on spawn
            lon: 0,             // Will be dynamically set on spawn
            radiusKM: 2.5,      // How wide the storm's danger zone is
            physicsInterval: 30 // Runs loop at ~33 FPS for smooth physics
        }
    };

    // 2. Environment Watcher: Wait for GeoFS and your Module to load completely
    function checkEnvironment() {
        const geofsReady = typeof geofs !== 'undefined' && geofs.animation && geofs.api && geofs.animation.values;
        const moduleReady = typeof window.AFSITornadoEngine !== 'undefined';

        // Additional check: Ensure the game has actually given the plane valid starting coordinates
        if (geofsReady && moduleReady && geofs.animation.values.lat !== 0) {
            console.log("✅ [AFSI] GeoFS and Particle Module verified. Spawning tornado...");
            initializeTornado();
        } else {
            // Check again in 250 milliseconds if not ready yet
            setTimeout(checkEnvironment, 250);
        }
    }

    // 3. Initialization: Dynamic Spawn Location Calculation
    function initializeTornado() {
        const viewer = geofs.api.viewer;
        
        // Grab the player's current spawn coordinates
        let spawnLat = geofs.animation.values.lat;
        let spawnLon = geofs.animation.values.lon;
        let heading = geofs.animation.values.heading || 0; // Direction the plane is facing

        // Offset the tornado slightly forward based on heading so you don't instantly crash into it
        // 0.02 degrees latitude is roughly 2.2 kilometers (about 1.3 miles) ahead
        let headingRad = heading * Math.PI / 180;
        CONFIG.tornado.lat = spawnLat + (Math.cos(headingRad) * 0.02);
        CONFIG.tornado.lon = spawnLon + (Math.sin(headingRad) * 0.02);

        console.log(`🌪️ [AFSI] Tornado dynamically spawned in front of you at Lat: ${CONFIG.tornado.lat}, Lon: ${CONFIG.tornado.lon}`);
        
        try {
            // Calls the visual engine code from particle.module.js
            window.AFSITornadoEngine.spawnVisualVortex(viewer, CONFIG.tornado.lat, CONFIG.tornado.lon, CONFIG.tornado.radiusKM);
        } catch (error) {
            console.error("❌ [AFSI] Visual generation error:", error);
        }

        // Start the continuous loop for aircraft telemetry tracking
        setInterval(runSimulationLoop, CONFIG.tornado.physicsInterval);
    }

    // 4. Core Simulation Loop: Calculates distance and applies forces
    function runSimulationLoop() {
        if (!geofs.animation.values) return; 

        const planeLat = geofs.animation.values.lat;
        const planeLon = geofs.animation.values.lon;

        // Pull the distance math directly out of your particle.module.js script
        const distance = window.AFSITornadoEngine.getDistanceKM(planeLat, planeLon, CONFIG.tornado.lat, CONFIG.tornado.lon);

        if (distance < CONFIG.tornado.radiusKM) {
            // Intensity scale: 1.0 at center, drops to 0.0 at the outer edge
            const intensity = 1 - (distance / CONFIG.tornado.radiusKM);

            applyTornadoForces(planeLat, planeLon, intensity);
        }
    }

    // 5. Physics Processor: Slams the aircraft flight variables
    function applyTornadoForces(planeLat, planeLon, intensity) {
        // Apply immediate turbulence (shaking the wings and nose)
        geofs.animation.values.roll += (Math.random() - 0.5) * 40 * intensity;
        geofs.animation.values.pitch += (Math.random() - 0.5) * 25 * intensity;

        // Fetch advanced directional vortex pull calculations from the module
        const vectors = window.AFSITornadoEngine.calculateVortexVectors(
            planeLat, 
            planeLon, 
            CONFIG.tornado.lat, 
            CONFIG.tornado.lon
        );

        if (geofs.aircraft && geofs.aircraft.instance) {
            // Push the plane violently skyward into the thermal updraft core
            geofs.aircraft.instance.velocity[2] += 50 * intensity;
        }
    }

    // Fire the initial setup check immediately at document-start
    checkEnvironment();
})();
