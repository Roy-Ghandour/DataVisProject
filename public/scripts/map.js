class StHimarkMap {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.width = 1200;
        this.height = 800;
        this.margin = { top: 50, right: 150, bottom: 50, left: 50 };
        
        // Metrics for uncertainty analysis
        this.metrics = [
            {value: 'report_completeness', label: 'Report Completeness'},
            {value: 'report_variance', label: 'Report Variance'},
            {value: 'report_count', label: 'Number of Reports'},
            // {value: 'time_consistency', label: 'Time Consistency'},
            {value: 'report_accuracy', label: 'Report Accuracy'}
        ];
        
        this.currentMetric = 'report_completeness';
        
        // Color scale for uncertainty (red = high uncertainty, green = low uncertainty)
        this.colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([0, 1]); // 0 = high uncertainty, 1 = low uncertainty
        
        this.init();
        this.loadData();
    }
    
    init() {
        this.container.html('');
        
        // Create metric selector
        const selector = this.container.append('select')
            .style('margin-bottom', '10px')
            .style('padding', '5px')
            .on('change', (event) => {
                this.currentMetric = event.target.value;
                this.updateColors();
            });
            
        selector.selectAll('option')
            .data(this.metrics)
            .enter()
            .append('option')
            .attr('value', d => d.value)
            .text(d => d.label);
        
        // Create SVG
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .style('background', '#fff');
            
        // Add title
        this.svg.append('text')
            .attr('class', 'map-title')
            .attr('x', this.width / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Average Report Completeness by Neighborhood');
    }
    
    loadData() {
        Promise.all([
            d3.json("StHitmark.geojson"),
            d3.csv("q2-data.csv")
        ]).then(([geoData, reportData]) => {
            // Process the data to calculate metrics for each neighborhood
            const metrics = d3.group(reportData, d => d.location);
            this.uncertaintyData = new Map();
            
            metrics.forEach((reports, location) => {
                const damageFields = ['sewer_and_water', 'power', 'roads_and_bridges', 'medical', 'buildings'];
                
                // Calculate completeness
                const completeness = reports.reduce((acc, report) => {
                    const filledFields = damageFields.filter(field => !isNaN(parseFloat(report[field]))).length;
                    return acc + (filledFields / damageFields.length);
                }, 0) / reports.length;
                
                // Calculate variance
                const variance = damageFields.reduce((acc, field) => {
                    const values = reports.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
                    return acc + (d3.variance(values) || 0);
                }, 0) / damageFields.length;

                // Calculate accuracy
                const accuracy = damageFields.map(field => {
                    const values = reports.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
                    if (values.length === 0) return 0;
                    
                    const mean = d3.mean(values);
                    const deviation = d3.deviation(values) || 0;
                    return Math.max(0, 1 - (deviation / mean));
                });
                const averageAccuracy = d3.mean(accuracy) || 0;
                
                this.uncertaintyData.set(location, {
                    report_completeness: completeness,
                    report_variance: Math.min(1, variance / 10), // Normalize variance
                    report_count: reports.length / 100, // Normalize count
                    report_accuracy: averageAccuracy,
                    time_consistency: 0.5 // Placeholder for now
                });
            });
            
            this.drawMap(geoData);
        }).catch(error => {
            console.error("Error loading data:", error);
        });
    }
    
    drawMap(geoData) {
        const projection = d3.geoMercator()
            .fitSize([
                this.width - this.margin.left - this.margin.right,
                this.height - this.margin.top - this.margin.bottom
            ], geoData);
            
        const path = d3.geoPath().projection(projection);
        
        const mapGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
            
        // Draw neighborhoods
        this.neighborhoods = mapGroup.selectAll('path')
            .data(geoData.features)
            .enter()
            .append('path')
            .attr('d', path)
            .style('stroke', '#fff')
            .style('stroke-width', 1);
            
        this.updateColors();
        this.addTooltips();
        this.createLegend();
    }
    
    updateColors() {
        // Update color scale domain based on metric type
        const currentMetricInfo = this.metrics.find(m => m.value === this.currentMetric);
        
        if (this.currentMetric === 'report_count') {
            // For report count, use actual values (multiplied by 100 since they're normalized)
            const values = Array.from(this.uncertaintyData.values())
                .map(d => d.report_count * 100);
            const maxCount = d3.max(values);
            this.colorScale.domain([0, maxCount]);
        } else {
            // For other metrics, use 0-1 range
            this.colorScale.domain([0, 1]);
        }

        this.neighborhoods
            .style('fill', d => {
                const metrics = this.uncertaintyData.get(d.properties.Id.toString());
                if (!metrics) return '#ccc';
                
                if (this.currentMetric === 'report_count') {
                    // Use actual report count value
                    return this.colorScale(metrics[this.currentMetric] * 100);
                }
                return this.colorScale(metrics[this.currentMetric]);
            });
            
        // Update title
        const metricInfo = this.metrics.find(m => m.value === this.currentMetric);
        this.svg.select('.map-title')
            .text(`Average ${metricInfo.label} by Neighborhood`);
        
        // Recreate the legend with updated format
        this.createLegend();
    }
    
    addTooltips() {
        // Add CSS for tooltip styling
        const style = document.createElement('style');
        style.textContent = `
            .tooltip {
                position: absolute;
                padding: 10px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #ddd;
                border-radius: 4px;
                pointer-events: none;
                font-family: Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                z-index: 1000;
            }
            .tooltip-row {
                margin: 4px 0;
            }
            .tooltip-label {
                font-weight: bold;
                color: #555;
            }
            .tooltip-value {
                float: right;
                margin-left: 15px;
                color: #333;
            }
        `;
        document.head.appendChild(style);

        this.neighborhoods
            .on('mouseover', (event, d) => {
                const metrics = this.uncertaintyData.get(d.properties.Id.toString());
                if (!metrics) return;
                
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'tooltip')
                    .style('opacity', 0);
                    
                const formatValue = (value) => {
                    if (typeof value === 'number') {
                        return (value * 100).toFixed(1) + '%';
                    }
                    return value;
                };

                const metricsToShow = [
                    { label: 'Neighborhood', value: d.properties.Nbrhood },
                    { label: 'Completeness', value: formatValue(metrics.report_completeness) },
                    { label: 'Variance', value: formatValue(metrics.report_variance) },
                    { label: 'Report Count', value: Math.round(metrics.report_count * 100) },
                    { label: 'Accuracy', value: formatValue(metrics.report_accuracy) }
                ];

                const content = metricsToShow.map(item => `
                    <div class="tooltip-row">
                        <span class="tooltip-label">${item.label}:</span>
                        <span class="tooltip-value">${item.value}</span>
                    </div>
                `).join('');
                
                tooltip.html(content)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .transition()
                    .duration(200)
                    .style('opacity', 1);
                    
                d3.select(event.target)
                    .style('stroke', '#000')
                    .style('stroke-width', 2);
            })
            .on('mousemove', (event) => {
                d3.select('.tooltip')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', (event) => {
                d3.selectAll('.tooltip')
                    .transition()
                    .duration(200)
                    .style('opacity', 0)
                    .remove();
                    
                d3.select(event.target)
                    .style('stroke', '#fff')
                    .style('stroke-width', 1);
            });
    }
    
    createLegend() {
        const legendWidth = 30;
        const legendHeight = 300;
        
        // Get the current metric info
        const currentMetricInfo = this.metrics.find(m => m.value === this.currentMetric);
        
        // Remove any existing legend elements
        this.svg.selectAll('defs').remove();
        this.svg.selectAll('.legend-group').remove();
        
        // Get the domain from the current color scale
        const domain = this.colorScale.domain();
        
        const legendScale = d3.scaleLinear()
            .domain(domain)
            .range([legendHeight, 0]);
            
        const legendAxis = d3.axisRight(legendScale)
            .tickFormat(currentMetricInfo.format)
            .ticks(5);
            
        const legend = this.svg.append('g')
            .attr('class', 'legend-group')
            .attr('transform', `translate(${this.width - this.margin.right + 20},${this.margin.top})`);
            
        // Create gradient
        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0)
            .attr('y1', legendHeight)
            .attr('x2', 0)
            .attr('y2', 0);
            
        // Add gradient stops
        const stops = d3.range(0, 1.1, 0.1);
        stops.forEach(stop => {
            const value = domain[0] + (domain[1] - domain[0]) * stop;
            gradient.append('stop')
                .attr('offset', `${stop * 100}%`)
                .attr('stop-color', this.colorScale(value));
        });
            
        // Add colored rectangle
        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#legend-gradient)');
            
        // Add axis
        legend.append('g')
            .attr('transform', `translate(${legendWidth},0)`)
            .call(legendAxis);
            
        // Add legend title
        legend.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -legendHeight/2)
            .attr('y', -30)
            .style('text-anchor', 'middle')
            .text(currentMetricInfo.legendTitle);
    }
    
    // createTimeSeriesView() {
    //     const timeSeriesChart = this.container.append('div')
    //         .attr('class', 'time-series-container');
            
    //     // Create multi-line chart
    //     const chart = timeSeriesChart.append('svg')
    //         .attr('width', this.width)
    //         .attr('height', 300);

    //     // Create tooltip div
    //     const tooltip = this.container.append('div')
    //         .attr('class', 'chart-tooltip')
    //         .style('opacity', 0)
    //         .style('position', 'absolute')
    //         .style('background', 'rgba(255, 255, 255, 0.9)')
    //         .style('padding', '8px')
    //         .style('border', '1px solid #ddd')
    //         .style('border-radius', '4px')
    //         .style('pointer-events', 'none')
    //         .style('font-size', '12px');

    //     // Add lines for each metric
    //     this.metrics.forEach(metric => {
    //         const data = this.getTimeSeriesData(metric.value);
    //         const line = chart.append('path')
    //             .datum(data)
    //             .attr('class', 'metric-line')
    //             .attr('d', d3.line()
    //                 .x(d => this.timeScale(d.time))
    //                 .y(d => this.valueScale(d.value))
    //             )
    //             .style('stroke', metric.color)
    //             .style('fill', 'none')
    //             .style('stroke-width', 2);

    //         // Add invisible dots for hover detection
    //         const dots = chart.selectAll(`.dot-${metric.value}`)
    //             .data(data)
    //             .enter()
    //             .append('circle')
    //             .attr('class', `dot-${metric.value}`)
    //             .attr('cx', d => this.timeScale(d.time))
    //             .attr('cy', d => this.valueScale(d.value))
    //             .attr('r', 5)
    //             .style('opacity', 0)
    //             .style('fill', metric.color);

    //         // Add hover effects
    //         dots.on('mouseover', (event, d) => {
    //             const [x, y] = d3.pointer(event);
                
    //             // Show the dot
    //             d3.select(event.target)
    //                 .style('opacity', 1);
                
    //             // Update tooltip
    //             tooltip.style('opacity', 1)
    //                 .style('left', (event.pageX + 10) + 'px')
    //                 .style('top', (event.pageY - 10) + 'px')
    //                 .html(`
    //                     <div><strong>${metric.label}</strong></div>
    //                     <div>Time: ${d.time.toLocaleString()}</div>
    //                     <div>Value: ${(d.value * 100).toFixed(1)}%</div>
    //                 `);
    //         })
    //         .on('mouseout', (event) => {
    //             // Hide the dot
    //             d3.select(event.target)
    //                 .style('opacity', 0);
                
    //             // Hide tooltip
    //             tooltip.style('opacity', 0);
    //         });
    //     });
            
    //     // Add interactive brushing
    //     const brush = d3.brushX()
    //         .on('brush', (event) => {
    //             const [start, end] = event.selection;
    //             this.updateMapForTimeRange(start, end);
    //         });
            
    //     chart.append('g')
    //         .attr('class', 'brush')
    //         .call(brush);
    // }
} 