export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function formatDateTime(date) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    };

    return date.toLocaleDateString('en-US', options);
}

export function getTimeUntilEvent(eventDate) {
    const now = new Date();
    const event = new Date(eventDate);
    const diff = event - now;

    if (diff < 0) {
        return {
            passed: true,
            timeRemaining: Math.abs(diff)
        };
    }

    return {
        passed: false,
        timeRemaining: diff
    };
}

export function formatTimeRemaining(timeRemaining, passed = false) {
    const seconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (passed) {
        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        }
        return 'Just passed';
    }

    if (days > 0) {
        const remainingHours = hours % 24;
        if (remainingHours > 0) {
            return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
        }
        return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        if (remainingMinutes > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}, ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
        }
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        if (remainingSeconds > 0 && minutes < 10) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}, ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
        }
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

export function extractYouTubeId(url) {
    if (!url) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

export function getCategoryLabel(category) {
    const labels = {
        meteor: 'Meteor Shower',
        planet: 'Planet Visibility',
        iss: 'ISS Pass',
        apod: 'NASA APOD',
        solar: 'Solar Event',
        astronomy: 'Open-Meteo Astronomy',
        natural: 'Natural Event'
    };
    return labels[category] || category;
}

export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function calculateMoonPhase(date) {
    const knownNewMoon = new Date('2025-01-11T00:00:00Z');
    const daysSinceNewMoon = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
    const lunarCycle = 29.53;
    return (daysSinceNewMoon % lunarCycle) / lunarCycle;
}

export function getMoonPhaseName(phase) {
    if (phase === 0 || phase === 1 || phase < 0.01) {
        return 'New Moon';
    } else if (phase < 0.25) {
        return 'Waxing Crescent';
    } else if (phase === 0.25 || (phase > 0.24 && phase < 0.26)) {
        return 'First Quarter';
    } else if (phase < 0.5) {
        return 'Waxing Gibbous';
    } else if (phase === 0.5 || (phase > 0.49 && phase < 0.51)) {
        return 'Full Moon';
    } else if (phase < 0.75) {
        return 'Waning Gibbous';
    } else if (phase === 0.75 || (phase > 0.74 && phase < 0.76)) {
        return 'Last Quarter';
    }
    return 'Waning Crescent';
}
