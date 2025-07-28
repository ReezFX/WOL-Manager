/**
 * Chart.js Color Configuration for WOL-Manager
 * Uses the webapp's color palette from variables.css
 */

// Color palette from CSS variables
const COLORS = {
    primary: '#17a2b8',        // Main turquoise color
    primaryRGB: [23, 162, 184],
    secondary: '#0d6e8c',      // Deeper blue-teal  
    secondaryRGB: [13, 110, 140],
    accent: '#ff7e5f',         // Complementary coral-orange
    accentRGB: [255, 126, 95],
    success: '#28b485',        // Distinct green
    successRGB: [40, 180, 133],
    info: '#5bc0de',           // Lighter blue
    infoRGB: [91, 192, 222],
    warning: '#f9ae56',        // Warm amber
    warningRGB: [249, 174, 86],
    danger: '#e25563',         // Clear red
    dangerRGB: [226, 85, 99]
};

// Chart.js Default Color Schemes
const CHART_COLORS = {
    // Primary color scheme for single data series
    primary: {
        background: `rgba(${COLORS.primaryRGB.join(',')}, 0.2)`,
        border: COLORS.primary,
        hover: `rgba(${COLORS.primaryRGB.join(',')}, 0.3)`
    },
    
    // Multi-color scheme for multiple data series
    multiColor: [
        {
            background: `rgba(${COLORS.primaryRGB.join(',')}, 0.2)`,
            border: COLORS.primary,
            hover: `rgba(${COLORS.primaryRGB.join(',')}, 0.3)`
        },
        {
            background: `rgba(${COLORS.accentRGB.join(',')}, 0.2)`,
            border: COLORS.accent,
            hover: `rgba(${COLORS.accentRGB.join(',')}, 0.3)`
        },
        {
            background: `rgba(${COLORS.successRGB.join(',')}, 0.2)`,
            border: COLORS.success,
            hover: `rgba(${COLORS.successRGB.join(',')}, 0.3)`
        },
        {
            background: `rgba(${COLORS.infoRGB.join(',')}, 0.2)`,
            border: COLORS.info,
            hover: `rgba(${COLORS.infoRGB.join(',')}, 0.3)`
        },
        {
            background: `rgba(${COLORS.warningRGB.join(',')}, 0.2)`,
            border: COLORS.warning,
            hover: `rgba(${COLORS.warningRGB.join(',')}, 0.3)`
        },
        {
            background: `rgba(${COLORS.dangerRGB.join(',')}, 0.2)`,
            border: COLORS.danger,
            hover: `rgba(${COLORS.dangerRGB.join(',')}, 0.3)`
        }
    ],
    
    // Gradient schemes for enhanced visuals
    gradients: {
        primary: {
            start: COLORS.primary,
            end: COLORS.secondary
        },
        accent: {
            start: COLORS.accent,
            end: COLORS.warning
        },
        success: {
            start: COLORS.success,
            end: COLORS.info
        }
    }
};

// Chart.js Global Configuration
const CHART_CONFIG = {
    // Default options for all charts
    defaults: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false  // Hide legends as per CSS
            },
            tooltip: {
                backgroundColor: 'rgba(20, 20, 25, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: `rgba(${COLORS.primaryRGB.join(',')}, 0.3)`,
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                boxPadding: 6,
                usePointStyle: true,
                titleFont: {
                    size: 13,
                    weight: '600'
                },
                bodyFont: {
                    size: 12,
                    weight: '500'
                },
                padding: 12
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        size: 11,
                        weight: '500'
                    }
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        size: 11,
                        weight: '500'
                    }
                }
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeOutCubic'
        }
    },
    
    // Specific configurations for different chart types
    doughnut: {
        cutout: '70%',
        plugins: {
            legend: {
                display: false
            }
        },
        elements: {
            arc: {
                borderWidth: 2,
                borderColor: 'rgba(30, 30, 35, 0.8)'
            }
        }
    },
    
    line: {
        elements: {
            line: {
                tension: 0.4,
                borderWidth: 3,
                fill: true
            },
            point: {
                radius: 4,
                hoverRadius: 6,
                borderWidth: 2,
                backgroundColor: 'rgba(30, 30, 35, 0.9)'
            }
        }
    },
    
    bar: {
        borderRadius: 6,
        borderSkipped: false,
        elements: {
            bar: {
                borderWidth: 1
            }
        }
    }
};

// Utility functions
const ChartUtils = {
    // Create gradient background
    createGradient: function(ctx, chartArea, colorStart, colorEnd) {
        if (!chartArea) return colorStart;
        
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, colorEnd);
        gradient.addColorStop(1, colorStart);
        return gradient;
    },
    
    // Get color scheme for number of data points
    getColorScheme: function(count) {
        if (count === 1) {
            return [CHART_COLORS.primary];
        }
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(CHART_COLORS.multiColor[i % CHART_COLORS.multiColor.length]);
        }
        return colors;
    },
    
    // Apply webapp colors to chart data
    applyColors: function(datasets, chartType = 'line') {
        datasets.forEach((dataset, index) => {
            const colorScheme = this.getColorScheme(datasets.length);
            const color = colorScheme[index] || CHART_COLORS.primary;
            
            if (chartType === 'doughnut' || chartType === 'pie') {
                dataset.backgroundColor = CHART_COLORS.multiColor.map(c => c.background);
                dataset.borderColor = CHART_COLORS.multiColor.map(c => c.border);
                dataset.hoverBackgroundColor = CHART_COLORS.multiColor.map(c => c.hover);
            } else {
                dataset.backgroundColor = color.background;
                dataset.borderColor = color.border;
                dataset.hoverBackgroundColor = color.hover;
                dataset.hoverBorderColor = color.border;
            }
        });
        
        return datasets;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { COLORS, CHART_COLORS, CHART_CONFIG, ChartUtils };
} else {
    window.CHART_COLORS = CHART_COLORS;
    window.CHART_CONFIG = CHART_CONFIG;
    window.ChartUtils = ChartUtils;
}
