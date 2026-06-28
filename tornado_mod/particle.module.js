// particle.module.js
// Dynamic Module for AFSI - Handles Tornado Visuals and Vector Physics

(function() {
    'use strict';

    console.log("📦 [AFSI Particles] Module loaded successfully.");

    // Attach our engine to the global window object
    window.AFSITornadoEngine = {
        version: "1.0.0",
        particleSystem: null,

        /**
         * Spawns a 3D rotating particle system and a visual radar ring in GeoFS
         * @param {Object} viewer - The geofs.api.viewer instance
         * @param {number} lat - Tornado latitude
         * @param {number} lon - Tornado longitude
         * @param {number} radiusKM - Danger radius in kilometers
         */
        spawnVisualVortex: function(viewer, lat, lon, radiusKM) {
            if (!viewer || !window.Cesium) {
                console.error("❌ [AFSI] Cesium or Viewer not detected yet.");
                return;
            }

            console.log("🌪️ [AFSI] Constructing tornado visual elements...");

            // 1. Define the Ground Position
            const position = Cesium.Cartesian3.fromDegrees(lon, lat, 0);

            // 2. Add a Ground Indicator (Visual Circle on Map)
            viewer.entities.add({
                position: position,
                ellipse: {
                    semiMinorAxis: radiusKM * 1000,
                    semiMajorAxis: radiusKM * 1000,
                    material: Cesium.Color.DARKGRAY.withAlpha(0.25),
                    outline: true,
                    outlineColor: Cesium.Color.RED,
                    outlineWidth: 3
                }
            });

            // 3. Create a Cesium Particle System for the Funnel Cloud
            // This creates a fountain of gray particles that shoots upward to look like a tornado
            this.particleSystem = viewer.scene.primitives.add(new Cesium.ParticleSystem({
                image: 'https://raw.githubusercontent.com/jazzyrazzy3026/AFSI/main/smoke.jpeg', // Fallback to a standard particle image if needed
                startColor: Cesium.Color.DARKGRAY.withAlpha(0.6),
                endColor: Cesium.Color.GRAY.withAlpha(0.0),
                startSize: 20.0,
                endSize: 120.0,
                minimumParticleLife: 3.0,
                maximumParticleLife: 6.0,
                minimumSpeed: 15.0,
                maximumSpeed: 40.0,
                imageSize: new Cesium.Cartesian2(25, 25),
                emissionRate: 150.0,
                lifetime: 16.0,
                loop: true,
                emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(15.0)), // Cone shape makes it wider at the top
                modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
                updateCallback: function(particle, dt) {
                    // This callback creates the spinning vortex effect inside the particle cloud
                    // It applies a rotational matrix over time to every single particle
                    let position = particle.position;
                    let speed = 0.5; // Rotation speed
                    let x = position.x * Math.cos(speed * dt) - position.y * Math.sin(speed * dt);
                    let y = position.x * Math.sin(speed * dt) + position.y * Math.cos(speed * dt);
                    position.x = x;
                    position.y = y;
                }
            }));
        },

        /**
         * Standard Great-Circle Distance math
         */
        getDistanceKM: function(lat1, lon1, lat2, lon2) {
            const R = 6371; // Radius of the earth in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        },

        /**
         * Calculates complex tornado vector forces (Pull and Angular Spin)
         * @param {number} pLat - Aircraft Latitude
         * @param {number} pLon - Aircraft Longitude
         * @param {number} tLat - Tornado Latitude
         * @param {number} tLon - Tornado Longitude
         * @returns {Object} Forces to apply to aircraft velocity vectors
         */
        calculateVortexVectors: function(pLat, pLon, tLat, tLon) {
            // Earth coordinates delta converted roughly to relative layout directional values
            let dy = tLat - pLat; 
            let dx = tLon - pLon;
            
            // Normalize the heading angle toward the center of the tornado
            let angleToCenter = Math.atan2(dy, dx);
            
            // In a real tornado, wind pulls you in AND throws you sideways (tangential velocity)
            let spinAngle = angleToCenter + (Math.PI / 2); // 90 degrees offset creates the spiral spin

            return {
                pullX: Math.cos(angleToCenter),
                pullY: Math.sin(angleToCenter),
                spinX: Math.cos(spinAngle),
                spinY: Math.sin(spinAngle)
            };
        }
    };

})();
