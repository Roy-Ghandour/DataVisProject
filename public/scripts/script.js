// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, attempting to load data...");
    
    let reliabilityMap; // Store the map instance
    let smallMultiplesRadar; // Store the small multiples radar chart instance
    let allData; // Store all the data
    let rawData; // Store the raw CSV data
    
    // Load and process the data from the updated CSV file
    d3.csv("q2-data.csv").then(data => {
        // Debug log the first few records
        console.log("Raw data loaded, first few records:", data.slice(0, 5));
        console.log("Total records loaded:", data.length);
        
        // Store raw data for temporal visualization
        rawData = data;
        
        // Process the data for reliability metrics
        allData = processReliabilityData(data);
        console.log("Processed data structure:", allData);
        
        if (allData && allData.length > 0) {
            console.log("Sample neighborhood data:", {
                neighborhood: allData[0].neighborhood,
                metrics: allData[0].values
            });
        } else {
            console.error("No data available after processing");
        }

        // Create small multiples radar chart
        console.log("Creating small multiples radar chart");
        smallMultiplesRadar = new SmallMultiplesRadar("#small-multiples-radar", allData);

        // Create the reliability map
        console.log("Creating reliability map");
        reliabilityMap = new StHimarkMap("#reliability-map");

        // Add event listener for damage type dropdown
        const damageTypeSelect = document.getElementById('damage-type');

    }).catch(error => {
        console.error("Error loading or processing the CSV file:", error);
        console.error("Error stack trace:", error.stack);
    });
});

function calculateReportFrequency(reports) {
    // Calculates reports per hour
    const timestamps = reports.map(d => new Date(d.time))
    const timeRange = d3.extent(timestamps);
    const hours = Math.max(1, (timeRange[1] - timeRange[0]) / (1000 * 60 * 60));
    return reports.length / hours;
}

function calculateReportConsistency(reports) {
    // Calculates consistency across damage assessment fields
    const fields = ['sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
    const fieldConsistencies = fields.map(field => {
        const values = reports.map(d => parseFloat(d[field]));
        const mean = d3.mean(values);
        const deviations = values.map(v => Math.abs(v - mean));
        const avgDeviation = d3.mean(deviations);
        return Math.max(0, Math.min(1, 1 / (1 + avgDeviation)));
    });
    return d3.mean(fieldConsistencies);
}

function calculateReportTimeliness(reports) {
    // Calculates time between consecutive reports
    const timestamps = reports.map(d => new Date(d.time)).sort((a, b) => a - b);
    const timeDiffs = [];
    for (let i = 1; i < timestamps.length; i++) {
        timeDiffs.push((timestamps[i] - timestamps[i-1]) / (1000 * 60 * 60));
    }
    const avgTimeBetweenReports = d3.mean(timeDiffs);
    return Math.max(0, Math.min(1, 1 - (avgTimeBetweenReports / 24)));
}

function calculateReportCompleteness(reports) {
    const damageFields = ['sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
    const reportScores = reports.map(report => {
        const validAssessments = damageFields.filter(field => {
            const value = parseFloat(report[field]);
            return !isNaN(value) && value >= 0 && value <= 10;
        }).length;
        return validAssessments / damageFields.length;
    });
    return d3.mean(reportScores);
}

function calculateReportCoverage(reports) {
    const timestamps = reports.map(d => new Date(d.time)).sort((a, b) => a - b);
    const timeRange = timestamps[timestamps.length - 1] - timestamps[0];
    const totalHours = Math.max(1, timeRange / (1000 * 60 * 60));
    const hoursWithReports = new Set(
        timestamps.map(t => Math.floor(t.getTime() / (1000 * 60 * 60)))
    ).size;
    return Math.min(1, hoursWithReports / totalHours);
}

function calculateReportAccuracy(reports) {
    const damageFields = ['sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
    const deviations = damageFields.map(field => {
        const values = reports.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
        const mean = d3.mean(values);
        const deviation = d3.deviation(values) || 0;
        return Math.max(0, 1 - (deviation / mean));
    });
    return d3.mean(deviations);
}

function calculateDetailLevel(reports) {
    const detailFields = ['sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
    const detailScores = reports.map(report => {
        const filledFields = detailFields.filter(field => {
            const value = parseFloat(report[field]);
            return !isNaN(value);
        }).length;
        return filledFields / detailFields.length;
    });
    return d3.mean(detailScores);
}

function calculateResponseRate(reports) {
    const timestamps = reports.map(d => new Date(d.time)).sort((a, b) => a - b);
    const hourlyReports = new Map();
    const startHour = Math.floor(timestamps[0].getTime() / (1000 * 60 * 60));
    const endHour = Math.floor(timestamps[timestamps.length - 1].getTime() / (1000 * 60 * 60));
    
    for (let hour = startHour; hour <= endHour; hour++) {
        hourlyReports.set(hour, 0);
    }
    
    timestamps.forEach(time => {
        const hour = Math.floor(time.getTime() / (1000 * 60 * 60));
        hourlyReports.set(hour, (hourlyReports.get(hour) || 0) + 1);
    });

    const rates = Array.from(hourlyReports.values());
    const maxRate = Math.max(...rates);
    const avgRate = d3.mean(rates) || 0;
    const hoursWithReports = rates.filter(r => r > 0).length;
    const totalHours = rates.length;
    
    const consistencyScore = avgRate / maxRate;
    const coverageScore = hoursWithReports / totalHours;
    
    return (consistencyScore * 0.7) + (coverageScore * 0.3);
}
