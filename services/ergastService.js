// C:\Users\clint\f1-tipping-site\backend\services\ergastService.js

const axios = require('axios');

// Base URL for the Jolpica Ergast API
const API_BASE_URL = 'http://api.jolpi.ca/ergast/f1';

/**
 * Fetch drivers from the Jolpica Ergast API
 * @param {string} season - Season year (e.g., '2025')
 * @returns {Promise<Array>} - Array of driver objects
 */
const fetchDrivers = async (season = '2025') => {
  try {
    console.log(`Fetching ${season} drivers from Jolpica API`);
    const response = await axios.get(`${API_BASE_URL}/${season}/drivers`);
    
    if (response.data && response.data.MRData && response.data.MRData.DriverTable) {
      const drivers = response.data.MRData.DriverTable.Drivers;
      console.log(`Successfully fetched ${drivers.length} drivers from Jolpica API`);
      
      // Transform data to match our model format
      return drivers.map(driver => ({
        driverId: driver.driverId,
        code: driver.code,
        givenName: driver.givenName,
        familyName: driver.familyName,
        number: driver.permanentNumber,
        nationality: driver.nationality,
        active: true
      }));
    }
    
    console.log('No drivers found in API response');
    return [];
  } catch (error) {
    console.error('Error fetching drivers from Jolpica API:', error.message);
    throw error;
  }
};

/**
 * Fetch constructors (teams) from the Jolpica Ergast API
 * @param {string} season - Season year (e.g., '2025')
 * @returns {Promise<Array>} - Array of constructor objects
 */
const fetchConstructors = async (season = '2025') => {
  try {
    console.log(`Fetching ${season} constructors from Jolpica API`);
    const response = await axios.get(`${API_BASE_URL}/${season}/constructors`);
    
    if (response.data && response.data.MRData && response.data.MRData.ConstructorTable) {
      const constructors = response.data.MRData.ConstructorTable.Constructors;
      console.log(`Successfully fetched ${constructors.length} constructors from Jolpica API`);
      
      // Transform data to match our model format
      return constructors.map(constructor => ({
        constructorId: constructor.constructorId,
        name: constructor.name,
        nationality: constructor.nationality,
        active: true
      }));
    }
    
    console.log('No constructors found in API response');
    return [];
  } catch (error) {
    console.error('Error fetching constructors from Jolpica API:', error.message);
    throw error;
  }
};

/**
 * Fetch qualifying results from the Jolpica Ergast API
 * @param {string} season - Season year (e.g., '2025')
 * @param {string} round - Race round number
 * @returns {Promise<Array>} - Qualifying results
 */
const fetchQualifyingResults = async (season, round) => {
  try {
    console.log(`Fetching ${season} round ${round} qualifying results from Jolpica API`);
    const response = await axios.get(`${API_BASE_URL}/${season}/${round}/qualifying`);
    
    if (response.data && response.data.MRData && response.data.MRData.RaceTable && 
        response.data.MRData.RaceTable.Races && response.data.MRData.RaceTable.Races.length > 0) {
      
      const qualifyingData = response.data.MRData.RaceTable.Races[0].QualifyingResults;
      console.log(`Successfully fetched qualifying results for ${qualifyingData.length} drivers`);
      
      // Transform data to match our needs
      return qualifyingData.map(result => ({
        position: result.position,
        driverId: result.Driver.driverId,
        code: result.Driver.code,
        name: `${result.Driver.givenName} ${result.Driver.familyName}`,
        constructorId: result.Constructor.constructorId,
        constructorName: result.Constructor.name,
        q1: result.Q1 || null,
        q2: result.Q2 || null,
        q3: result.Q3 || null
      }));
    }
    
    console.log('No qualifying results found in API response');
    return [];
  } catch (error) {
    console.error('Error fetching qualifying results from Jolpica API:', error.message);
    return [];  // Return empty array on error to prevent blocking the rest of the process
  }
};

/**
 * Fetch race results from the Jolpica Ergast API
 * @param {string} season - Season year (e.g., '2025')
 * @param {string} round - Race round number
 * @returns {Promise<Object>} - Race results object
 */
const fetchRaceResults = async (season, round) => {
  try {
    console.log(`Fetching ${season} round ${round} results from Jolpica API`);
    const response = await axios.get(`${API_BASE_URL}/${season}/${round}/results`);
    
    if (response.data && response.data.MRData && response.data.MRData.RaceTable && 
        response.data.MRData.RaceTable.Races && response.data.MRData.RaceTable.Races.length > 0) {
      
      const raceData = response.data.MRData.RaceTable.Races[0];
      const results = raceData.Results;
      
      console.log(`Successfully fetched results for ${results.length} drivers`);
      
      // Transform data to match our model format
      const formattedResults = results.map(result => ({
        position: result.position,
        driverId: result.Driver.driverId,
        code: result.Driver.code,
        givenName: result.Driver.givenName,
        familyName: result.Driver.familyName,
        constructorId: result.Constructor.constructorId,
        constructorName: result.Constructor.name,
        grid: result.grid,
        status: result.status,
        points: parseFloat(result.points),
        laps: parseInt(result.laps),
        time: result.Time?.time || null,
        fastestLap: result.FastestLap ? {
          rank: result.FastestLap.rank,
          lap: result.FastestLap.lap,
          time: result.FastestLap.Time?.time,
          averageSpeed: result.FastestLap.AverageSpeed ? {
            units: result.FastestLap.AverageSpeed.units,
            speed: result.FastestLap.AverageSpeed.speed
          } : null
        } : null
      }));
      
      // Determine fastest lap driver
      const fastestLapDriver = formattedResults.find(r => r.fastestLap?.rank === '1')?.driverId || null;
      
        // Determine first retirement - defined as the last-placed driver who wasn't disqualified
        console.log('Calculating first retirement based on last placed driver not disqualified');

        // Filter out disqualified drivers
        const nonDisqualifiedDrivers = formattedResults.filter(driver => 
          driver.status !== 'Disqualified'
        );

        // Log eligible drivers
        console.log('Non-disqualified drivers:');
        nonDisqualifiedDrivers.forEach(driver => {
          console.log(`- ${driver.driverId} (${driver.code}): Position ${driver.position}, Status: ${driver.status}`);
        });

        // Convert position to numeric and find highest (last place)
        let lastPlacedDriver = null;
        let highestPosition = -1;

        for (const driver of nonDisqualifiedDrivers) {
          const posNum = parseInt(driver.position);
          console.log(`Checking ${driver.driverId}: position ${posNum} vs current highest ${highestPosition}`);
          
          if (!isNaN(posNum) && posNum > highestPosition) {
            highestPosition = posNum;
            lastPlacedDriver = driver;
            console.log(`New last placed driver: ${driver.driverId} (Position: ${posNum})`);
          }
        }

        const firstRetirement = lastPlacedDriver ? lastPlacedDriver.driverId : null;
        console.log(`First retirement set to: ${firstRetirement} (last placed driver with position ${highestPosition})`);
      
      // Get podium (top 3 finishers)
      const podium = formattedResults
        .filter(r => parseInt(r.position) <= 3)
        .sort((a, b) => parseInt(a.position) - parseInt(b.position))
        .map(r => r.driverId);
      
      // Get pole position from qualifying
      let polePosition = null;
      try {
        const qualifyingResults = await fetchQualifyingResults(season, round);
        if (qualifyingResults && qualifyingResults.length > 0) {
          polePosition = qualifyingResults[0].driverId;
        }
      } catch (err) {
        console.error('Error getting pole position:', err.message);
      }
      
      return {
        results: formattedResults,
        polePosition: polePosition,
        podium: podium,
        fastestLap: fastestLapDriver,
        firstRetirement: firstRetirement
      };
    }
    
    console.log('No race results found in API response');
    return null;
  } catch (error) {
    console.error('Error fetching race results from Jolpica API:', error.message);
    throw error;
  }
};

/**
 * Fetch races with qualifying times from the Jolpica Ergast API
 * @param {string} season - Season year (e.g., '2025')
 * @returns {Promise<Array>} - Array of race objects with qualifying times
 */
const fetchRaces = async (season = '2025') => {
  try {
    console.log(`Fetching ${season} races from Jolpica API`);
    const response = await axios.get(`${API_BASE_URL}/${season}`);
    
    if (response.data && response.data.MRData && response.data.MRData.RaceTable) {
      const races = response.data.MRData.RaceTable.Races;
      console.log(`Successfully fetched ${races.length} races from Jolpica API`);
      
      // Transform data to match our model format
      return races.map(race => {
        // Combine date and time for race datetime
        const raceDateTime = new Date(`${race.date}T${race.time}`);
        
        // Process qualifying datetime if available
        let qualifyingDateTime = null;
        if (race.Qualifying) {
          qualifyingDateTime = new Date(`${race.Qualifying.date}T${race.Qualifying.time}`);
          console.log(`Race ${race.raceName}: Qualifying at ${qualifyingDateTime.toISOString()}`);
        } else {
          console.log(`Race ${race.raceName}: No qualifying time available`);
        }
        
        return {
          season: race.season,
          round: race.round,
          raceName: race.raceName,
          date: raceDateTime,
          time: race.time,
          qualifyingDateTime: qualifyingDateTime,
          circuit: {
            name: race.Circuit.circuitName,
            location: race.Circuit.Location.locality,
            country: race.Circuit.Location.country
          },
          status: 'upcoming' // Default status for imported races
        };
      });
    }
    
    console.log('No races found in API response');
    return [];
  } catch (error) {
    console.error('Error fetching races from Jolpica API:', error.message);
    throw error;
  }
};

module.exports = {
  fetchDrivers,
  fetchConstructors,
  fetchQualifyingResults,
  fetchRaceResults,
  fetchRaces
};