function escapeText(v: string) {
  return v
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}
function date(v: string) {
  return new Date(v)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}
function fold(line: string) {
  let rows = [''];
  for (const c of line) {
    if (new TextEncoder().encode(rows[rows.length - 1] + c).length > 75) rows.push(' ');
    rows[rows.length - 1] += c;
  }
  return rows.join('\r\n');
}
export function calendar(
  id: string,
  title: string,
  items: {
    title: string;
    start?: string;
    end?: string;
    url?: string;
    status?: string;
    place?: { name: string; address?: string };
    bookingWindow?: { checkinDate: string; checkoutDate: string };
  }[],
) {
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OpenMaaS//Plans//JA',
      'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:${escapeText(title)}`,
      ...items.flatMap((i, n) =>
        i.start || i.bookingWindow
          ? [
              'BEGIN:VEVENT',
              `UID:${id}-${n}@openmaas`,
              `DTSTAMP:${date(new Date().toISOString())}`,
              ...(i.start
                ? [`DTSTART:${date(i.start)}`, ...(i.end ? [`DTEND:${date(i.end)}`] : [])]
                : [
                    `DTSTART;VALUE=DATE:${i.bookingWindow!.checkinDate.replaceAll('-', '')}`,
                    `DTEND;VALUE=DATE:${i.bookingWindow!.checkoutDate.replaceAll('-', '')}`,
                  ]),
              `SUMMARY:${escapeText(i.title)}`,
              ...(i.place
                ? [
                    `LOCATION:${escapeText([i.place.name, i.place.address].filter(Boolean).join(' '))}`,
                  ]
                : []),
              i.status === 'cancelled' ? 'STATUS:CANCELLED' : 'STATUS:TENTATIVE',
              ...(i.url ? [`URL:${i.url}`] : []),
              'END:VEVENT',
            ]
          : [],
      ),
      'END:VCALENDAR',
    ]
      .map(fold)
      .join('\r\n') + '\r\n'
  );
}
