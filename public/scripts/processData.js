// Data processing for reliability metrics
function processReliabilityData(csvData) {
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
        console.error("Invalid or empty CSV data");
        return [];
    }

    console.log("Processing data, sample record:", csvData[0]);
    
    // Group data by neighborhood
    const neighborhoodMap = d3.group(csvData, d => d.location);
    
    if (neighborhoodMap.size === 0) {
        console.error("No neighborhoods found in data");
        return [];
    }

    console.log(`Found ${neighborhoodMap.size} neighborhoods`);
    
    const neighborhoodData = Array.from(neighborhoodMap, ([key, values]) => ({
        key: key || 'Unknown',
        values: values || []
    }));

    // Calculate reliability metrics for each neighborhood
    const processedData = neighborhoodData.map(neighborhood => {
        const reports = neighborhood.values;
        if (!reports || reports.length === 0) {
            console.warn(`No reports for neighborhood ${neighborhood.key}`);
            return {
                neighborhood: neighborhood.key,
                values: [
                    { axis: "Frequency", value: 0, rawValue: 0 },
                    { axis: "Consistency", value: 0, rawValue: 0 },
                    { axis: "Timeliness", value: 0, rawValue: 0 },
                    { axis: "Completeness", value: 0, rawValue: 0 },
                    { axis: "Coverage", value: 0, rawValue: 0 },
                    { axis: "Accuracy", value: 0, rawValue: 0 },
                    { axis: "Detail", value: 0, rawValue: 0 },
                    { axis: "Response Rate", value: 0, rawValue: 0 }
                ]
            };
        }

        // Calculate metrics with raw values
        const metrics = {
            reportFrequency: calculateReportFrequency(reports),
            reportConsistency: calculateReportConsistency(reports),
            reportTimeliness: calculateReportTimeliness(reports),
            reportCompleteness: calculateReportCompleteness(reports),
            reportCoverage: calculateReportCoverage(reports),
            reportAccuracy: calculateReportAccuracy(reports),
            reportDetail: calculateDetailLevel(reports),
            responseRate: calculateResponseRate(reports)
        };

        // Debug log raw metrics for this neighborhood
        console.log(`Raw metrics for ${neighborhood.key}:`, {
            frequency: `${metrics.reportFrequency.toFixed(2)} reports/hour`,
            consistency: `${(metrics.reportConsistency * 100).toFixed(1)}%`,
            timeliness: `${metrics.reportTimeliness.toFixed(1)} hours between reports`,
            completeness: `${(metrics.reportCompleteness * 100).toFixed(1)}%`,
            coverage: `${(metrics.reportCoverage * 100).toFixed(1)}%`,
            accuracy: `${(metrics.reportAccuracy * 100).toFixed(1)}%`,
            detail: `${(metrics.reportDetail * 100).toFixed(1)}%`,
            responseRate: `${(metrics.responseRate * 100).toFixed(1)}%`
        });

        // Normalize timeliness inversely (faster is better)
        const normalizedTimeliness = metrics.reportTimeliness > 0 
            ? 1 - normalizeMetric(metrics.reportTimeliness, 0, 24) // normalize over 24 hours
            : 0;

        // Store both normalized and raw values
        return {
            neighborhood: neighborhood.key,
            values: [
                { 
                    axis: "Frequency", 
                    value: normalizeMetric(metrics.reportFrequency, 0, 5), // Normalize for reports per hour
                    rawValue: metrics.reportFrequency.toFixed(2)
                },
                { 
                    axis: "Consistency", 
                    value: metrics.reportConsistency, // Already normalized 0-1
                    rawValue: (metrics.reportConsistency * 100).toFixed(1)
                },
                { 
                    axis: "Timeliness", 
                    value: normalizedTimeliness,
                    rawValue: metrics.reportTimeliness.toFixed(1)
                },
                { 
                    axis: "Completeness", 
                    value: metrics.reportCompleteness, // Already normalized 0-1
                    rawValue: (metrics.reportCompleteness * 100).toFixed(1)
                },
                { 
                    axis: "Coverage", 
                    value: metrics.reportCoverage, // Already normalized 0-1
                    rawValue: (metrics.reportCoverage * 100).toFixed(1)
                },
                {
                    axis: "Accuracy",
                    value: metrics.reportAccuracy,
                    rawValue: (metrics.reportAccuracy * 100).toFixed(1)
                },
                {
                    axis: "Detail",
                    value: metrics.reportDetail,
                    rawValue: (metrics.reportDetail * 100).toFixed(1)
                },
                {
                    axis: "Response Rate",
                    value: metrics.responseRate,
                    rawValue: (metrics.responseRate * 100).toFixed(1)
                }
            ]
        };
    });

    console.log("Processed data sample:", processedData[0]);
    return processedData;
}

function calculateReportFrequency(reports) {
    try {
        const timestamps = reports
            .map(d => {
                try {
                    return new Date(d.time);
                } catch (e) {
                    console.warn("Invalid time format:", d.time);
                    return null;
                }
            })
            .filter(d => d !== null && !isNaN(d.getTime()));

        if (timestamps.length < 2) return 0;

        const timeRange = d3.extent(timestamps);
        const hours = Math.max(1, (timeRange[1] - timeRange[0]) / (1000 * 60 * 60));
        return reports.length / hours;
    } catch (e) {
        console.error("Error calculating report frequency:", e);
        return 0;
    }
}

function calculateReportConsistency(reports) {
    try {
        // Calculate consistency based on all damage assessment fields
        const fields = ['sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
        
        // Calculate average consistency across all fields
        const fieldConsistencies = fields.map(field => {
            const values = reports
                .map(d => parseFloat(d[field]))
                .filter(v => !isNaN(v));
                
            if (values.length === 0) return 0;
            
            const mean = d3.mean(values);
            const deviations = values.map(v => Math.abs(v - mean));
            const avgDeviation = d3.mean(deviations);
            
            // Normalize to 0-1 where 1 is most consistent
            return Math.max(0, Math.min(1, 1 / (1 + avgDeviation)));
        });
        
        // Return average consistency across all fields
        return d3.mean(fieldConsistencies) || 0;
    } catch (e) {
        console.error("Error calculating consistency:", e);
        return 0;
    }
}

function calculateReportTimeliness(reports) {
    try {
        // Sort reports by timestamp
        const timestamps = reports
            .map(d => new Date(d.time))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a - b);

        if (timestamps.length < 2) return 0;
        
        // Calculate time differences between consecutive reports in hours
        const timeDiffs = [];
        for (let i = 1; i < timestamps.length; i++) {
            timeDiffs.push((timestamps[i] - timestamps[i-1]) / (1000 * 60 * 60));
        }
        
        // Calculate average time between reports
        const avgTimeBetweenReports = d3.mean(timeDiffs) || 0;
        
        // Normalize timeliness: 
        // 0 hours between reports = 1 (best)
        // 24+ hours between reports = 0 (worst)
        // Linear scale in between
        return Math.max(0, Math.min(1, 1 - (avgTimeBetweenReports / 24)));
    } catch (e) {
        console.error("Error calculating timeliness:", e);
        return 0;
    }
}

function calculateReportCompleteness(reports) {
    try {
        // Define required fields and their valid ranges
        const damageFields = ['sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
        
        // Calculate completeness for each report
        const reportScores = reports.map(report => {
            // Check basic fields
            if (!report.location || !report.time) return 0;
            
            // Calculate score based on meaningful damage assessments
            const validAssessments = damageFields.filter(field => {
                const value = parseFloat(report[field]);
                // Consider a value meaningful if it's between 0 and 10 (the expected range for damage scores)
                return !isNaN(value) && value >= 0 && value <= 10;
            }).length;
            
            return validAssessments / damageFields.length;
        });
        
        // Overall completeness is the average of all report scores
        return d3.mean(reportScores) || 0;
    } catch (e) {
        console.error("Error calculating completeness:", e);
        return 0;
    }
}

function calculateReportCoverage(reports) {
    try {
        // Calculate coverage based on time range and report distribution
        const timestamps = reports
            .map(d => new Date(d.time))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a - b);

        if (timestamps.length < 2) return 0;

        const timeRange = timestamps[timestamps.length - 1] - timestamps[0];
        const totalHours = Math.max(1, timeRange / (1000 * 60 * 60));
        const hoursWithReports = new Set(
            timestamps.map(t => Math.floor(t.getTime() / (1000 * 60 * 60)))
        ).size;

        return Math.min(1, hoursWithReports / totalHours);
    } catch (e) {
        console.error("Error calculating coverage:", e);
        return 0;
    }
}

function calculateReportAccuracy(reports) {
    try {
        // Compare damage levels with neighboring reports
        const damageFields = ['sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
        
        // Calculate average deviation from neighborhood mean
        const deviations = damageFields.map(field => {
            const values = reports.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
            if (values.length === 0) return 0;
            
            const mean = d3.mean(values);
            const deviation = d3.deviation(values) || 0;
            return Math.max(0, 1 - (deviation / mean));
        });
        
        return d3.mean(deviations) || 0;
    } catch (e) {
        console.error("Error calculating accuracy:", e);
        return 0;
    }
}

function calculateDetailLevel(reports) {
    try {
        // Check for presence of detailed information
        const detailFields = ['sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
        
        const detailScores = reports.map(report => {
            // Count how many damage fields are filled with valid numbers
            const filledFields = detailFields.filter(field => {
                const value = parseFloat(report[field]);
                return !isNaN(value);
            }).length;
            
            // Calculate score based on filled fields
            return filledFields / detailFields.length;
        });
        
        return d3.mean(detailScores) || 0;
    } catch (e) {
        console.error("Error calculating detail level:", e);
        return 0;
    }
}

function calculateResponseRate(reports) {
    try {
        // Sort reports by timestamp
        const timestamps = reports
            .map(d => new Date(d.time))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a - b);

        if (timestamps.length < 2) return 0;

        // Calculate reports per hour for each hour in the time range
        const hourlyReports = new Map();
        const startHour = Math.floor(timestamps[0].getTime() / (1000 * 60 * 60));
        const endHour = Math.floor(timestamps[timestamps.length - 1].getTime() / (1000 * 60 * 60));
        
        // Initialize all hours with 0 reports
        for (let hour = startHour; hour <= endHour; hour++) {
            hourlyReports.set(hour, 0);
        }
        
        // Count reports per hour
        timestamps.forEach(time => {
            const hour = Math.floor(time.getTime() / (1000 * 60 * 60));
            hourlyReports.set(hour, (hourlyReports.get(hour) || 0) + 1);
        });

        // Calculate response rate metrics
        const rates = Array.from(hourlyReports.values());
        const maxRate = Math.max(...rates);
        const avgRate = d3.mean(rates) || 0;
        const hoursWithReports = rates.filter(r => r > 0).length;
        const totalHours = rates.length;
        
        // Combine consistency of reporting with coverage
        const consistencyScore = avgRate / maxRate; // How consistent the reporting rate is
        const coverageScore = hoursWithReports / totalHours; // What proportion of hours had reports
        
        // Final score is a weighted average favoring consistent reporting
        return (consistencyScore * 0.7) + (coverageScore * 0.3);
    } catch (e) {
        console.error("Error calculating response rate:", e);
        return 0;
    }
}

function normalizeMetric(value, min, max) {
    if (value === undefined || value === null || isNaN(value)) {
        console.warn(`Invalid value for normalization: ${value}`);
        return 0;
    }
    if (min === max) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Process temporal data for damage reports
function processTemporalData(csvData, damageType) {
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
        console.error("Invalid or empty CSV data");
        return [];
    }

    // Group data by time intervals (e.g., hourly)
    const timeGroups = d3.group(csvData, d => {
        const date = new Date(d.time);
        // Round to nearest hour
        date.setMinutes(0, 0, 0);
        return date;
    });

    // Process each time group
    const temporalData = Array.from(timeGroups, ([date, reports]) => {
        // Calculate average damage value for the selected type
        const values = reports.map(d => parseFloat(d[damageType])).filter(v => !isNaN(v));
        const meanValue = d3.mean(values) || 0;
        
        // Calculate uncertainty (standard deviation)
        const stdDev = values.length > 1 ? d3.deviation(values) || 0 : 0;
        
        return {
            date: date,
            value: meanValue,
            uncertainty: stdDev,
            count: values.length
        };
    });

    // Sort by date
    return temporalData.sort((a, b) => a.date - b.date);
}

// Get available damage types
function getDamageTypes() {
    return [
        'sewer_and_water',
        'power',
        'roads_and_bridges',
        'medical',
        'buildings'
    ];
}

// Export the processing function
window.processReliabilityData = processReliabilityData; 