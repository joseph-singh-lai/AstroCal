import { filteredEvents } from './state.js';

function formatIcsDate(iso) {
    const d = new Date(iso);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcs(text) {
    return (text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateIcs(events) {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AstroCalTT//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:AstroCalTT Events'
    ];

    events.forEach(event => {
        const uid = `${event.id}@astrocaltt`;
        const dtstart = formatIcsDate(event.datetime);
        const dtend = formatIcsDate(new Date(new Date(event.datetime).getTime() + 60 * 60 * 1000));
        lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${formatIcsDate(new Date())}`,
            `DTSTART:${dtstart}`,
            `DTEND:${dtend}`,
            `SUMMARY:${escapeIcs(event.title)}`,
            `DESCRIPTION:${escapeIcs(event.description || '')}`,
            `LOCATION:${escapeIcs(event.location || 'La Brea, Trinidad & Tobago')}`,
            'END:VEVENT'
        );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

export function downloadFilteredIcs() {
    const upcoming = filteredEvents.filter(e => new Date(e.datetime) >= new Date());
    const ics = generateIcs(upcoming.slice(0, 50));
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astrocaltt-events.ics';
    a.click();
    URL.revokeObjectURL(url);
}

export async function shareEvent(event) {
    const text = `${event.title}\n${event.description || ''}\n${window.location.href}`;
    if (navigator.share) {
        try {
            await navigator.share({ title: event.title, text });
            return;
        } catch {
            /* fall through */
        }
    }
    try {
        await navigator.clipboard.writeText(text);
        alert('Event details copied to clipboard.');
    } catch {
        prompt('Copy event details:', text);
    }
}

export function setupCalendarExport() {
    const btn = document.getElementById('exportIcsButton');
    if (btn) {
        btn.addEventListener('click', downloadFilteredIcs);
    }
}
