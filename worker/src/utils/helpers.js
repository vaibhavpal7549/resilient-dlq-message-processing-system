/**
 * Utility Helper Functions
 * 
 * Common utility functions used across the DLQ worker service.
 */

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff with jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseMs - Base delay in milliseconds
 * @param {number} maxMs - Maximum delay in milliseconds
 * @param {number} jitterPercent - Jitter percentage (0-100)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(attempt, baseMs = 1000, maxMs = 60000, jitterPercent = 20) {
    // Exponential backoff: baseMs * 2^attempt
    const exponential = baseMs * Math.pow(2, attempt);

    // Cap at maximum
    const capped = Math.min(exponential, maxMs);

    // Add jitter to prevent thundering herd
    const jitter = capped * (jitterPercent / 100);
    const randomJitter = Math.random() * jitter - (jitter / 2);

    return Math.floor(capped + randomJitter);
}

/**
 * Calculate next retry timestamp based on backoff schedule
 * @param {number} retryCount - Current retry count
 * @param {number[]} backoffMinutes - Array of backoff delays in minutes
 * @returns {Date} Next retry timestamp
 */
function calculateNextRetry(retryCount, backoffMinutes = [1, 5, 15, 30, 60]) {
    const index = Math.min(retryCount, backoffMinutes.length - 1);
    const delayMinutes = backoffMinutes[index];
    return new Date(Date.now() + delayMinutes * 60 * 1000);
}

/**
 * Calculate next scheduled retry at off-peak hours
 * @param {number} offPeakHour - Hour of day for off-peak processing (0-23)
 * @returns {Date} Next off-peak timestamp
 */
function calculateOffPeakRetry(offPeakHour = 2) {
    const now = new Date();
    const nextRun = new Date(now);

    // Set to next occurrence of off-peak hour
    nextRun.setHours(offPeakHour, 0, 0, 0);

    // If off-peak hour already passed today, schedule for tomorrow
    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

/**
 * Safely parse JSON with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
function safeJsonParse(jsonString, fallback = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        return fallback;
    }
}

/**
 * Generate unique worker ID
 * @returns {string} Unique worker identifier
 */
function generateWorkerId() {
    const hostname = require('os').hostname();
    const pid = process.pid;
    const timestamp = Date.now();
    return `worker_${hostname}_${pid}_${timestamp}`;
}

/**
 * Check if a date is in the past
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in the past
 */
function isPast(date) {
    return date && new Date(date) <= new Date();
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
function truncate(str, maxLength = 100) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

module.exports = {
    sleep,
    calculateBackoff,
    calculateNextRetry,
    calculateOffPeakRetry,
    formatDuration,
    safeJsonParse,
    generateWorkerId,
    isPast,
    truncate
};
