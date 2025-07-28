/**
 * Statistics Charts Implementation for WOL-Manager
 * Uses the webapp's color palette and modern styling
 */

// Ensure Chart.js and color configuration are loaded
if (typeof Chart === 'undefined') {
    console.error('Chart.js is required but not loaded');
}

if (typeof CHART_COLORS === 'undefined') {
    console.error('chart-colors.js is required but not loaded');
}

// Chart instances storage
const chartInstances = new Map();

/**
 * Initialize all statistics charts
 */
function initializeStatisticsCharts() {
    // Device Status Doughnut Chart
    initDeviceStatusChart();
    
    // WoL Success Rate Line Chart
    initSuccessRateChart();
    
    // Device Usage Bar Chart
    initDeviceUsageChart();
}

/**
 * Device Status Doughnut Chart
 */
function initDeviceStatusChart() {
    const canvas = document.getElementById('deviceStatusChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (chartInstances.has('deviceStatus')) {
        chartInstances.get('deviceStatus').destroy();
    }
    
    const chartConfig = {
        type: 'doughnut',
        data: {
            labels: ['Online', 'Offline', 'Unknown'],
            datasets: [{
                data: [0, 0, 0], // Will be updated with real data
                backgroundColor: [
                    CHART_COLORS.multiColor[2].background, // Success green for online
                    CHART_COLORS.multiColor[5].background, // Danger red for offline
                    CHART_COLORS.multiColor[4].background  // Warning amber for unknown
                ],
                borderColor: [
                    CHART_COLORS.multiColor[2].border,
                    CHART_COLORS.multiColor[5].border,
                    CHART_COLORS.multiColor[4].border
                ],
                hoverBackgroundColor: [
                    CHART_COLORS.multiColor[2].hover,
                    CHART_COLORS.multiColor[5].hover,
                    CHART_COLORS.multiColor[4].hover
                ],
                borderWidth: 2
            }]
        },
        options: {
            ...CHART_CONFIG.defaults,
            ...CHART_CONFIG.doughnut,
            plugins: {
                ...CHART_CONFIG.defaults.plugins,
                tooltip: {
                    ...CHART_CONFIG.defaults.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    };
    
    const chart = new Chart(ctx, chartConfig);
    chartInstances.set('deviceStatus', chart);
    
    return chart;
}

/**
 * WoL Success Rate Line Chart
 */
function initSuccessRateChart() {
    const canvas = document.getElementById('successRateChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (chartInstances.has('successRate')) {
        chartInstances.get('successRate').destroy();
    }
    
    const chartConfig = {
        type: 'line',
        data: {
            labels: [], // Will be populated with dates
            datasets: [{
                label: 'Success Rate (%)',
                data: [], // Will be populated with success rate data
                backgroundColor: CHART_COLORS.primary.background,
                borderColor: CHART_COLORS.primary.border,
                hoverBackgroundColor: CHART_COLORS.primary.hover,
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: CHART_COLORS.gradients.primary.start,
                pointBorderColor: CHART_COLORS.gradients.primary.end,
                pointBorderWidth: 2
            }]
        },
        options: {
            ...CHART_CONFIG.defaults,
            ...CHART_CONFIG.line,
            scales: {
                ...CHART_CONFIG.defaults.scales,
                y: {
                    ...CHART_CONFIG.defaults.scales.y,
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        ...CHART_CONFIG.defaults.scales.y.ticks,
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                ...CHART_CONFIG.defaults.plugins,
                tooltip: {
                    ...CHART_CONFIG.defaults.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            return `Success Rate: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    };
    
    const chart = new Chart(ctx, chartConfig);
    chartInstances.set('successRate', chart);
    
    return chart;
}

/**
 * Device Usage Bar Chart
 */
function initDeviceUsageChart() {
    const canvas = document.getElementById('deviceUsageChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (chartInstances.has('deviceUsage')) {
        chartInstances.get('deviceUsage').destroy();
    }
    
    const chartConfig = {
        type: 'bar',
        data: {
            labels: [], // Will be populated with device names
            datasets: [{
                label: 'Usage Count',
                data: [], // Will be populated with usage data
                backgroundColor: CHART_COLORS.multiColor.map(c => c.background),
                borderColor: CHART_COLORS.multiColor.map(c => c.border),
                hoverBackgroundColor: CHART_COLORS.multiColor.map(c => ChartUtils.createGradient(ctx, ctx.canvas.getContext('2d').canvas, c.background, c.hover)),
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...CHART_CONFIG.defaults,
            ...CHART_CONFIG.bar,
            scales: {
                ...CHART_CONFIG.defaults.scales,
                y: {
                    ...CHART_CONFIG.defaults.scales.y,
                    beginAtZero: true,
                    ticks: {
                        ...CHART_CONFIG.defaults.scales.y.ticks,
                        precision: 0
                    }
                }
            },
            plugins: {
                ...CHART_CONFIG.defaults.plugins,
                tooltip: {
                    ...CHART_CONFIG.defaults.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            return `Usage: ${context.raw} times`;
                        }
                    }
                }
            }
        }
    };
    
    const chart = new Chart(ctx, chartConfig);
    chartInstances.set('deviceUsage', chart);
    
    return chart;
}

/**
 * Update chart data
 */
function updateChartData(chartName, data) {
    const chart = chartInstances.get(chartName);
    if (!chart) {
        console.warn(`Chart '${chartName}' not found`);
        return;
    }
    
    switch (chartName) {
        case 'deviceStatus':
            chart.data.datasets[0].data = [
                data.online || 0,
                data.offline || 0,
                data.unknown || 0
            ];
            break;
            
        case 'successRate':
            chart.data.labels = data.labels || [];
            chart.data.datasets[0].data = data.values || [];
            break;
            
        case 'deviceUsage':
            chart.data.labels = data.labels || [];
            chart.data.datasets[0].data = data.values || [];
            // Update colors for the number of devices
            const colorCount = data.labels ? data.labels.length : 0;
            if (colorCount > 0) {
                const colors = ChartUtils.getColorScheme(colorCount);
                chart.data.datasets[0].backgroundColor = colors.map(c => c.background);
                chart.data.datasets[0].borderColor = colors.map(c => c.border);
                chart.data.datasets[0].hoverBackgroundColor = colors.map(c => c.hover);
            }
            break;
    }
    
    chart.update('active');
}

/**
 * Show loading state for a chart
 */
function showChartLoading(chartName) {
    const chart = chartInstances.get(chartName);
    if (!chart) return;
    
    chart.canvas.parentElement.classList.add('chart-loading');
}

/**
 * Hide loading state for a chart
 */
function hideChartLoading(chartName) {
    const chart = chartInstances.get(chartName);
    if (!chart) return;
    
    chart.canvas.parentElement.classList.remove('chart-loading');
    chart.canvas.parentElement.classList.add('chart-loaded');
}

/**
 * Destroy all charts
 */
function destroyAllCharts() {
    chartInstances.forEach((chart, name) => {
        chart.destroy();
    });
    chartInstances.clear();
}

/**
 * Resize all charts (useful for responsive behavior)
 */
function resizeAllCharts() {
    chartInstances.forEach((chart) => {
        chart.resize();
    });
}

// Initialize charts when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.statistics-dashboard')) {
        initializeStatisticsCharts();
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    setTimeout(resizeAllCharts, 100);
});

// Export functions for external use
if (typeof window !== 'undefined') {
    window.StatisticsCharts = {
        initialize: initializeStatisticsCharts,
        updateData: updateChartData,
        showLoading: showChartLoading,
        hideLoading: hideChartLoading,
        destroy: destroyAllCharts,
        resize: resizeAllCharts
    };
}
