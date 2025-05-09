// Mapping of location numbers to actual names
const locationNames = {
    "1": "Palace Hills",
    "2": "Northwest",
    "3": "Old Town",
    "4": "Safe Town",
    "5": "Southwest",
    "6": "Downtown",
    "7": "Wilson Forest",
    "8": "Scenic Vista",
    "9": "Broadview",
    "10": "Chapparal",
    "11": "Terrapin Springs",
    "12": "Pepper Mill",
    "13": "Cheddarford",
    "14": "Easton",
    "15": "Weston",
    "16": "Southton",
    "17": "Oak Willow",
    "18": "East Parton",
    "19": "West Parton"
};

// Function to get location name from number
function getLocationName(locationNumber) {
    return locationNames[locationNumber] || `Location ${locationNumber}`;
}

// Export the functions and mapping
window.locationNames = locationNames;
window.getLocationName = getLocationName; 