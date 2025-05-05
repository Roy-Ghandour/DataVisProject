class SmallMultiplesRadar {
    constructor(containerId, data, options = {}) {
        this.container = d3.select(containerId);
        this.data = data;
        
        // Define color mapping for neighborhoods
        this.colorMap = {
            'Palace Hills': '#1f77b4',      // Blue
            'Northwest': '#ff7f0e',         // Orange
            'Old Town': '#2ca02c',          // Green
            'Safe Town': '#d62728',         // Red
            'Southwest': '#9467bd',         // Purple
            'Downtown': '#8c564b',          // Brown
            'Wilson Forest': '#e377c2',     // Pink
            'Scenic Vista': '#7f7f7f',      // Gray
            'Broadview': '#bcbd22',         // Yellow-green
            'Chapparal': '#17becf',         // Cyan
            'Terrapin Springs': '#1f77b4',  // Blue
            'Pepper Mill': '#ff7f0e',       // Orange
            'Cheddarford': '#2ca02c',       // Green
            'Easton': '#d62728',           // Red
            'Weston': '#9467bd',           // Purple
            'Southton': '#8c564b',         // Brown
            'Oak Willow': '#e377c2',       // Pink
            'East Parton': '#7f7f7f',      // Gray
            'West Parton': '#bcbd22'       // Yellow-green
        };
        
        // Get the container width
        const containerWidth = this.container.node().getBoundingClientRect().width;
        
        this.options = {
            width: Math.min(1800, containerWidth - 40), // Responsive width with padding
            height: 1400, // Increased height for better spacing
            margin: { top: 120, right: 120, bottom: 120, left: 120 }, // Increased margins
            levels: 5,
            labelFactor: 1.25,
            wrapWidth: 60,
            dotRadius: 2,
            opacityArea: 0.35,
            strokeWidth: 1,
            ...options
        };
        
        this.init();
    }

    init() {
        // Clear any existing content
        this.container.select("svg").remove();

        // Calculate dimensions for each small radar chart
        const numCols = 4;
        const numRows = Math.ceil(this.data.length / numCols);
        const chartWidth = (this.options.width - this.options.margin.left - this.options.margin.right) / numCols;
        const chartHeight = (this.options.height - this.options.margin.top - this.options.margin.bottom) / numRows;
        const radius = Math.min(chartWidth, chartHeight) * 0.3; // Reduced radius for more spacing

        // Create SVG
        this.svg = this.container.append("svg")
            .attr("width", this.options.width)
            .attr("height", this.options.height)
            .append("g")
            .attr("transform", `translate(${this.options.margin.left},${this.options.margin.top})`);

        // Create scales
        this.angleScale = d3.scaleLinear()
            .domain([0, 8])
            .range([0, 2 * Math.PI]);

        this.radiusScale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, radius]);

        // Create small multiples
        this.data.forEach((neighborhoodData, i) => {
            const col = i % numCols;
            const row = Math.floor(i / numCols);
            
            const chartGroup = this.svg.append("g")
                .attr("transform", `translate(${col * chartWidth + chartWidth/2},${row * chartHeight + chartHeight/2})`);

            // Add neighborhood name with background for better readability
            const titleGroup = chartGroup.append("g")
                .attr("class", "title-group")
                .attr("transform", `translate(0,${-radius - 35})`); // Increased spacing

            // Add white background for title
            titleGroup.append("rect")
                .attr("x", -100)
                .attr("y", -12)
                .attr("width", 200)
                .attr("height", 24)
                .attr("fill", "white")
                .attr("rx", 4);

            titleGroup.append("text")
                .attr("class", "neighborhood-name")
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .text(getLocationName(neighborhoodData.neighborhood));

            // Draw grid
            this.drawGrid(chartGroup, radius);

            // Draw axes
            this.drawAxes(chartGroup, radius);

            // Draw data
            this.drawData(chartGroup, neighborhoodData, radius);
        });
    }

    drawGrid(group, radius) {
        const levels = this.options.levels;
        const gridData = Array.from({length: levels}, (_, i) => (i + 1) / levels);
        
        // Draw circular grid lines
        gridData.forEach(level => {
            group.append("circle")
                .attr("class", "grid-circle")
                .attr("r", this.radiusScale(level))
                .attr("fill", "none")
                .attr("stroke", "#ddd")
                .attr("stroke-width", 0.5)
                .attr("stroke-dasharray", "2,2");
        });
    }

    drawAxes(group, radius) {
        const axes = ["Frequency", "Consistency", "Timeliness", "Completeness", "Coverage", "Accuracy", "Detail", "Response Rate"];

        // Create axis groups
        const axisGroups = group.selectAll(".axis-group")
            .data(axes)
            .enter()
            .append("g")
            .attr("class", "axis-group");

        // Draw axes lines
        axisGroups.append("line")
            .attr("class", "axis")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", (d, i) => radius * Math.cos(this.angleScale(i) - Math.PI/2))
            .attr("y2", (d, i) => radius * Math.sin(this.angleScale(i) - Math.PI/2))
            .attr("stroke", "#666")
            .attr("stroke-width", 0.5);

        // Draw axis labels with improved positioning
        const labelGroups = axisGroups.append("g")
            .attr("class", "axis-label-group")
            .attr("transform", (d, i) => {
                const angle = this.angleScale(i) - Math.PI/2;
                const x = (radius + 25) * Math.cos(angle);
                const y = (radius + 25) * Math.sin(angle);
                return `translate(${x},${y})`;
            });

        // Add white background for labels
        labelGroups.append("rect")
            .attr("x", -30)
            .attr("y", -8)
            .attr("width", 60)
            .attr("height", 16)
            .attr("fill", "white")
            .attr("rx", 2);

        // Add the text labels
        labelGroups.append("text")
            .style("text-anchor", (d, i) => {
                const angle = this.angleScale(i);
                if (angle < Math.PI/6 || angle > 11*Math.PI/6) return "start";
                if (angle > 5*Math.PI/6 && angle < 7*Math.PI/6) return "end";
                return "middle";
            })
            .style("font-size", "11px")
            .style("dominant-baseline", "middle")
            .attr("dx", (d, i) => {
                const angle = this.angleScale(i);
                if (angle < Math.PI/6 || angle > 11*Math.PI/6) return "5";
                if (angle > 5*Math.PI/6 && angle < 7*Math.PI/6) return "-5";
                return "0";
            })
            .text(d => d);
    }

    drawData(group, neighborhoodData, radius) {
        const line = d3.lineRadial()
            .angle((d, i) => this.angleScale(i))
            .radius(d => this.radiusScale(d.value))
            .curve(d3.curveLinearClosed);

        // Draw the path with hover functionality
        group.append("path")
            .attr("class", "neighborhood-path")
            .attr("d", line(neighborhoodData.values))
            .style("fill", this.colorMap[getLocationName(neighborhoodData.neighborhood)])
            .style("fill-opacity", this.options.opacityArea)
            .style("stroke", this.colorMap[getLocationName(neighborhoodData.neighborhood)])
            .style("stroke-width", this.options.strokeWidth)
            .on("mouseover", (event) => {
                // Create tooltip
                const tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0)
                    .style("background", "rgba(255, 255, 255, 0.95)")
                    .style("padding", "10px")
                    .style("border", "1px solid #ddd")
                    .style("border-radius", "4px")
                    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
                    .style("font-size", "12px");

                // Format metrics for tooltip
                const metrics = neighborhoodData.values.map(v => {
                    let formattedValue = (v.value * 100).toFixed(1) + "%";
                    let rawValueText = "";
                    
                    switch(v.axis) {
                        case 'Frequency': 
                            rawValueText = ` (${v.rawValue} reports/hour)`; 
                            break;
                        case 'Consistency': 
                            rawValueText = ` (variance: ${v.rawValue})`; 
                            break;
                        case 'Timeliness': 
                            rawValueText = ` (${v.rawValue} hrs between reports)`; 
                            break;
                        case 'Completeness': 
                        case 'Coverage': 
                        case 'Accuracy':
                        case 'Detail':
                        case 'Response Rate':
                            rawValueText = ` (${v.rawValue}% raw score)`;
                            break;
                    }
                    return `<div style="margin: 4px 0;"><strong>${v.axis}:</strong> ${formattedValue}${rawValueText}</div>`;
                }).join("");

                // Set tooltip content and position
                tooltip.html(`
                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                        ${getLocationName(neighborhoodData.neighborhood)}
                    </div>
                    ${metrics}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .transition()
                    .duration(200)
                    .style("opacity", 1);

                // Highlight the path
                d3.select(event.currentTarget)
                    .style("fill-opacity", this.options.opacityArea * 1.5)
                    .style("stroke-width", this.options.strokeWidth * 1.5);
            })
            .on("mouseout", (event) => {
                // Remove tooltip
                d3.select(".tooltip").remove();
                
                // Reset path style
                d3.select(event.currentTarget)
                    .style("fill-opacity", this.options.opacityArea)
                    .style("stroke-width", this.options.strokeWidth);
            });

        // Add dots at data points with hover functionality
        group.selectAll(".data-point")
            .data(neighborhoodData.values)
            .enter()
            .append("circle")
            .attr("class", "data-point")
            .attr("cx", (d, i) => this.radiusScale(d.value) * Math.cos(this.angleScale(i) - Math.PI/2))
            .attr("cy", (d, i) => this.radiusScale(d.value) * Math.sin(this.angleScale(i) - Math.PI/2))
            .attr("r", this.options.dotRadius)
            .style("fill", this.colorMap[getLocationName(neighborhoodData.neighborhood)])
            .style("stroke", "white")
            .style("stroke-width", 2)
            .on("mouseover", (event, d) => {
                // Create tooltip
                const tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0)
                    .style("background", "rgba(255, 255, 255, 0.95)")
                    .style("padding", "8px")
                    .style("border", "1px solid #ddd")
                    .style("border-radius", "4px")
                    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
                    .style("font-size", "12px");

                // Format value and raw value
                let formattedValue = (d.value * 100).toFixed(1) + "%";
                let rawValueText = "";
                
                switch(d.axis) {
                    case 'Frequency': 
                        rawValueText = ` (${d.rawValue} reports/hour)`; 
                        break;
                    case 'Consistency': 
                        rawValueText = ` (variance: ${d.rawValue})`; 
                        break;
                    case 'Timeliness': 
                        rawValueText = ` (${d.rawValue} hrs between reports)`; 
                        break;
                    case 'Completeness': 
                    case 'Coverage': 
                    case 'Accuracy':
                    case 'Detail':
                    case 'Response Rate':
                        rawValueText = ` (${d.rawValue}% raw score)`;
                        break;
                }

                // Set tooltip content and position
                tooltip.html(`
                    <div style="font-weight: bold; margin-bottom: 4px;">
                        ${getLocationName(neighborhoodData.neighborhood)}
                    </div>
                    <div><strong>${d.axis}:</strong> ${formattedValue}</div>
                    <div style="color: #666;">${rawValueText}</div>
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .transition()
                    .duration(200)
                    .style("opacity", 1);

                // Highlight the point
                d3.select(event.currentTarget)
                    .attr("r", this.options.dotRadius * 1.5)
                    .style("stroke-width", 3);
            })
            .on("mouseout", (event) => {
                // Remove tooltip
                d3.select(".tooltip").remove();
                
                // Reset point style
                d3.select(event.currentTarget)
                    .attr("r", this.options.dotRadius)
                    .style("stroke-width", 2);
            });
    }
} 