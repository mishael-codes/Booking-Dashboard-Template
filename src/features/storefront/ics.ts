function toIcsUtc(isoDate: string): string {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcsText(val: string): string {
  return val
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function downloadBookingIcs(params: {
  reference: string;
  serviceName: string;
  resourceName: string;
  businessName: string;
  address?: string | null;
  startsAt: string;
  endsAt: string;
}) {
  const uid = `${params.reference}@booking-portal`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Appointment Booking Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(params.startsAt)}`,
    `DTEND:${toIcsUtc(params.endsAt)}`,
    `SUMMARY:${escapeIcsText(`${params.serviceName} — ${params.businessName}`)}`,
    `DESCRIPTION:${escapeIcsText(`Booking Reference: #${params.reference}\nSpecialist: ${params.resourceName}`)}`,
    ...(params.address ? [`LOCATION:${escapeIcsText(params.address)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-${params.reference}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
