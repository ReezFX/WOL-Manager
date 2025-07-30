// Statistics functionality
if (typeof window.statisticsCharts === 'undefined') {
    window.statisticsCharts = {};
}
let statisticsCharts = window.statisticsCharts;

// Make selectedTimeRangeValue available globally
if (typeof window.selectedTimeRangeValue === 'undefined') {
    window.selectedTimeRangeValue = '7'; // Default value
}

function initializeStatistics() {
    // Load Chart.js if not already loaded
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        script.onload = function() {
            loadStatistics();
        };
        document.head.appendChild(script);
    } else {
        loadStatistics();
    }
}

function loadStatistics() {
    const selectedDays = window.selectedTimeRangeValue || '7';
    
    // Load all three statistics
    Promise.all([
        loadDeviceStatus(),
        loadWolSuccessRate(selectedDays),
        loadDeviceUsage()
    ]).catch(error => {
        console.error('Error loading statistics:', error);
    });
}

// Make loadStatistics available globally
window.loadStatistics = loadStatistics;

// Initialize statistics when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Statistics module loaded');
    
    // Initialize statistics
    initializeStatistics();
    
    // Set up refresh button
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.animation = 'spin 1s linear';
            }
            
            loadStatistics().finally(() => {
                setTimeout(() => {
                    if (icon) {
                        icon.style.animation = '';
                    }
                }, 1000);
            });
        });
        console.log('Refresh button initialized');
    }
});

function loadDeviceStatus() {
    const contentDiv = document.getElementById('deviceStatusContent');
    if (!contentDiv) return Promise.resolve();
    
    return fetch('/api/device_status')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            createDeviceStatusChart(contentDiv, data);
        })
        .catch(error => {
            console.error('Error loading device status:', error);
            showChartError(contentDiv, 'Failed to load device status');
        });
}

function loadWolSuccessRate(days) {
    const contentDiv = document.getElementById('wolSuccessContent');
    if (!contentDiv) return Promise.resolve();
    
    return fetch(`/api/wol_success_rate?days=${days}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            createWolSuccessChart(contentDiv, data);
        })
        .catch(error => {
            console.error('Error loading WoL success rate:', error);
            showChartError(contentDiv, 'Failed to load success rate');
        });
}

function loadDeviceUsage() {
    const contentDiv = document.getElementById('deviceUsageContent');
    if (!contentDiv) return Promise.resolve();
    
    return fetch('/api/device_usage')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            createDeviceUsageChart(contentDiv, data);
        })
        .catch(error => {
            console.error('Error loading device usage:', error);
            showChartError(contentDiv, 'Failed to load device usage');
        });
}

function createDeviceStatusChart(container, data) {
    // Destroy existing chart
    if (statisticsCharts.deviceStatus) {
        statisticsCharts.deviceStatus.destroy();
    }
    
    // Check if data is empty
    if (!data.data || data.data.every(val => val === 0)) {
        showChartEmpty(container, 'No devices found');
        return;
    }
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    container.innerHTML = '';
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.appendChild(canvas);
    container.appendChild(chartContainer);
    
    // Create chart
    const ctx = canvas.getContext('2d');
    statisticsCharts.deviceStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: [
                    'rgba(40, 180, 133, 0.8)',   // Success green for online
                    'rgba(226, 85, 99, 0.8)',    // Danger red for offline
                    'rgba(249, 174, 86, 0.8)'    // Warning amber for unknown
                ],
                borderColor: [
                    'rgba(40, 180, 133, 1)',
                    'rgba(226, 85, 99, 1)',
                    'rgba(249, 174, 86, 1)'
                ],
                hoverBackgroundColor: [
                    'rgba(40, 180, 133, 0.9)',
                    'rgba(226, 85, 99, 0.9)',
                    'rgba(249, 174, 86, 0.9)'
                ],
                borderWidth: 2,
                cutout: '65%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 5,
                    left: 8,
                    right: 1,
                    bottom: 5
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 10,
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 1000
            }
        }
    });
}

function createWolSuccessChart(container, data) {
    // Destroy existing chart
    if (statisticsCharts.wolSuccess) {
        statisticsCharts.wolSuccess.destroy();
    }
    
    // Check if data is empty
    if (!data.data || data.data.length === 0) {
        showChartEmpty(container, 'No WoL attempts recorded');
        return;
    }
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    container.innerHTML = '';
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.appendChild(canvas);
    container.appendChild(chartContainer);
    
    // Create chart
    const ctx = canvas.getContext('2d');
    statisticsCharts.wolSuccess = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Success Rate (%)',
                data: data.data,
                borderColor: 'rgb(23, 162, 184)',
                backgroundColor: 'rgba(23, 162, 184, 0.15)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(23, 162, 184)',
                pointBorderColor: 'rgb(13, 110, 140)',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 8,
                    left: 5,
                    right: 10,
                    bottom: 5
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '10%',
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 9
                        },
                        maxRotation: 45,
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Success Rate: ${context.raw}%`;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function createDeviceUsageChart(container, data) {
    // Destroy existing chart
    if (statisticsCharts.deviceUsage) {
        statisticsCharts.deviceUsage.destroy();
    }
    
    // Check if data is empty
    if (!data.data || data.data.length === 0 || data.data.every(val => val === 0)) {
        showChartEmpty(container, 'No usage data available');
        return;
    }
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    container.innerHTML = '';
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.appendChild(canvas);
    container.appendChild(chartContainer);
    
    // Create chart
    const ctx = canvas.getContext('2d');
    statisticsCharts.deviceUsage = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Wake Attempts',
                data: data.data,
                backgroundColor: 'rgba(255, 126, 95, 0.7)',
                borderColor: 'rgba(255, 126, 95, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 8,
                    left: 5,
                    right: 10,
                    bottom: 5
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '10%',
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 10
                        },
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 9
                        },
                        maxRotation: 45,
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const count = context.raw;
                            return `Wake attempts: ${count}`;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function showChartError(container, message) {
    container.innerHTML = `
        <div class="statistic-error">
            <i class="fas fa-exclamation-triangle error-icon"></i>
            <div class="error-message">${message}</div>
        </div>
    `;
}

function showChartEmpty(container, message) {
    container.innerHTML = `
        <div class="statistic-empty">
            <i class="fas fa-chart-pie empty-icon"></i>
            <div class="empty-message">${message}</div>
        </div>
    `;
}
