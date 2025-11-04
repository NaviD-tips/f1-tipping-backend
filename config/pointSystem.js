// C:\Users\clint\f1-tipping-site\backend\config\pointSystem.js

/**
 * Point system configuration for F1 prediction scoring
 */
const POINT_SYSTEM = {
    podium: {
      winner: 6,         // P1 exactly correct (6 points)
      secondPlace: 4,    // P2 exactly correct (4 points)
      thirdPlace: 2,     // P3 exactly correct (2 points)
      correctDriver: 1   // Driver in podium but wrong position (1 point)
    },
    polePosition: 2,      // Pole position (2 points)
    fastestLap: 1,        // Fastest lap (1 point)
    firstRetirement: 1,   // First retirement (1 point)
    headToHead: {
      driver: 1,          // Driver head-to-head (1 point)
      team: 1             // Team head-to-head (1 point)
    },
    bonuses: {
      perfectPodium: 6   // All 3 podium positions exactly correct (6 bonus points)
    }
  };
  
  module.exports = POINT_SYSTEM;