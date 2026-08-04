"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './RaceCard.module.css';
import Countdown from './Countdown';
import Image from 'next/image';
import { circuitData } from '@/lib/circuitData';
import { getSessionState as getSharedSessionState, getSessionEndTime } from '@/lib/sessionUtils';

const ChevronIcon = ({ expanded }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.25s ease',
      display: 'inline-block',
      verticalAlign: 'middle'
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const WeatherIcon = ({ code }) => {
  if (code === null || code === undefined) return null;

  const iconStyle = {
    verticalAlign: 'middle',
    marginLeft: '0.4rem',
    cursor: 'default',
    flexShrink: 0
  };

  // Sunny
  if ([0, 1].includes(code)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffe600" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }
  // Rain
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
        <line x1="8" y1="18" x2="8" y2="22" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="16" y1="18" x2="16" y2="22" />
      </svg>
    );
  }
  // Thunderstorm
  if ([95, 96, 99].includes(code)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff007f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" />
        <polyline points="13 11 9 17 12 17 11 23" />
      </svg>
    );
  }
  // Snow
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4" />
      </svg>
    );
  }
  // Cloudy / Overcast / Foggy (Default)
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0a0a5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
      <path d="M20 16.24A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
    </svg>
  );
};

export default function RaceCard({ race, isNext }) {
  const [expanded, setExpanded] = useState(isNext);
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [activeCalendarIndex, setActiveCalendarIndex] = useState(null);
  const activeCalendarRef = useRef(null);

  // Close calendar popover on click outside.
  // On mobile (browser + PWA), the tap that opens the popover can otherwise
  // also be seen by this listener and immediately close it again, making the
  // first tap look like it did nothing. Guarding with a containment check
  // (instead of closing on any click) fixes that race.
  useEffect(() => {
    if (activeCalendarIndex === null) return;
    const handleOutsideClick = (event) => {
      if (activeCalendarRef.current && activeCalendarRef.current.contains(event.target)) {
        return;
      }
      setActiveCalendarIndex(null);
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [activeCalendarIndex]);

  // Session duration logic
  const getSessionTimes = (sessionName, rawTime) => {
    if (!rawTime) return null;
    const start = new Date(rawTime);
    const end = getSessionEndTime(start, sessionName);
    return { start, end };
  };

  // On Android, our installed PWA counts as a separate "app" handing off a URL,
  // so Android's App Links resolve calendar.google.com to whatever native calendar
  // app is registered for it instead of opening the page in Chrome. If that app
  // hasn't finished loading its calendar list yet (cold start), it shows "no
  // calendar has been synchronised with this device yet" instead of adding the
  // event — which is also why it works fine once that app is already warm.
  //
  // The fix: instead of navigating to a calendar.google.com URL (which gets
  // intercepted by App Links and goes to the Calendar app's main activity),
  // fire a direct Calendar INSERT intent. This uses Android's
  // android.intent.action.INSERT action with vnd.android.cursor.item/event
  // MIME type, which routes to the Calendar app's dedicated "create event"
  // Activity — a separate, simpler component that accepts structured event
  // data as intent extras and works even on cold start because it doesn't
  // need the calendar list synced to show the event creation form.
  //
  // The Google Calendar web URL is included as browser_fallback_url so Chrome
  // opens it in a tab if no calendar app is installed.
  const openGoogleCalendar = (session, race) => {
    const times = getSessionTimes(session.name, session.rawTime);
    if (!times) return;

    const title = `F1 ${race.date.split('-')[0]} - ${race.raceName} - ${session.name}`;
    const description = `Formula 1 - ${race.raceName} - ${session.name} session. Powered by F1 Paddock Analytics.`;
    const location = `${race.Circuit.circuitName}, ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`;

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isAndroid) {
      // Build a Calendar INSERT intent URI. Android's intent filter for
      // calendar event creation uses action INSERT + event MIME type.
      // Event details are passed as typed extras: S. = String, l. = long.
      const fallbackUrl = getGoogleCalendarLink(session, race);
      const intentParts = [
        'intent://#Intent',
        'action=android.intent.action.INSERT',
        'type=vnd.android.cursor.item/event',
        `S.title=${encodeURIComponent(title)}`,
        `S.description=${encodeURIComponent(description)}`,
        `S.eventLocation=${encodeURIComponent(location)}`,
        `l.beginTime=${times.start.getTime()}`,
        `l.endTime=${times.end.getTime()}`,
        `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
        'end',
      ];
      window.location.href = intentParts.join(';');
    } else if (isIOS) {
      // On iOS, try the Google Calendar app's URL scheme first.
      // If the app is installed, iOS will open it and background our page;
      // if not, the scheme silently fails (no error dialog on modern iOS).
      // We detect which happened via visibilitychange: if the page goes
      // hidden within ~1.5 s the app opened; otherwise fall back to the
      // Google Calendar web page in a new Safari tab.
      const webUrl = getGoogleCalendarLink(session, race);
      const formatISO = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const appUrl = `googlecalendar://event/new?title=${encodeURIComponent(title)}&begin=${formatISO(times.start)}&end=${formatISO(times.end)}&location=${encodeURIComponent(location)}&notes=${encodeURIComponent(description)}`;

      let didLeave = false;
      const onVisibility = () => { if (document.hidden) didLeave = true; };
      document.addEventListener('visibilitychange', onVisibility);

      window.location.href = appUrl;

      setTimeout(() => {
        document.removeEventListener('visibilitychange', onVisibility);
        if (!didLeave) {
          // App didn't open — not installed. Open the web version.
          window.open(webUrl, '_blank', 'noopener,noreferrer');
        }
      }, 1500);
    } else {
      // Desktop / other — just open the Google Calendar web page.
      const rawUrl = getGoogleCalendarLink(session, race);
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Google Calendar link builder
  const getGoogleCalendarLink = (session, race) => {
    const times = getSessionTimes(session.name, session.rawTime);
    if (!times) return '#';

    const formatDateToGoogle = (date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const title = encodeURIComponent(`F1 ${race.date.split('-')[0]} - ${race.raceName} - ${session.name}`);
    const dates = `${formatDateToGoogle(times.start)}/${formatDateToGoogle(times.end)}`;
    const details = encodeURIComponent(`Formula 1 - ${race.raceName} - ${session.name} session. Powered by F1 Paddock Analytics.`);
    const location = encodeURIComponent(`${race.Circuit.circuitName}, ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  // iCal/ICS — opens directly in Apple Calendar on iOS, downloads .ics
  // file on Android/desktop (for Outlook, Google Calendar import, etc.).
  const downloadIcsFile = (session, race) => {
    const times = getSessionTimes(session.name, session.rawTime);
    if (!times) return;

    const title = `F1 ${race.date.split('-')[0]} - ${race.raceName} - ${session.name}`;
    const location = `${race.Circuit.circuitName}, ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`;
    const description = `Formula 1 - ${race.raceName} - ${session.name} session. Powered by F1 Paddock Analytics.`;

    const formatDateToIcs = (date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const startStr = formatDateToIcs(times.start);
    const endStr = formatDateToIcs(times.end);

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Paddock Schedule//F1 Calendar//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `SUMMARY:${title}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR"
    ];

    const icsContent = icsLines.join("\r\n");
    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isIOS) {
      // On iOS, the <a download> pattern just dumps the file into the Files
      // app instead of opening it in Calendar. Using a data: URI with the
      // text/calendar MIME type makes iOS recognise the content as a
      // calendar event and present the native "Add to Calendar" dialog.
      window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
    } else {
      // Android / desktop — trigger a normal .ics file download.
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    setExpanded(isNext);
  }, [isNext]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setNow(new Date());
    }, 0);
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update once every 60 seconds
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!expanded || !race.Circuit?.Location) return;

    const raceDate = new Date(race.date);
    const today = new Date();

    // Find the Monday of the race week (0 = Sunday, 6 = Saturday)
    const day = raceDate.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    const raceWeekMonday = new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate() + offset);

    // Reset times to midnight local time for accurate calendar day calculations
    const d1 = new Date(raceWeekMonday.getFullYear(), raceWeekMonday.getMonth(), raceWeekMonday.getDate());
    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dRace = new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate());

    const diffToMonday = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
    const diffToRace = Math.round((dRace - d2) / (1000 * 60 * 60 * 24));

    // Only fetch weather if today is Monday of the race week or later, and the race isn't more than 3 days in the past
    if (diffToMonday > 0 || diffToRace < -3) return;

    let isMounted = true;
    const { lat, long } = race.Circuit.Location;

    async function fetchWeather() {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&hourly=temperature_2m,precipitation_probability,weather_code,relative_humidity_2m,apparent_temperature&timezone=auto&forecast_days=10`
        );
        if (!response.ok) throw new Error('API failure');
        const data = await response.json();
        if (isMounted && data.hourly) {
          setWeatherData(data.hourly);
        }
      } catch (err) {
        console.error('Failed to fetch session weather:', err);
      }
    }

    fetchWeather();
    return () => {
      isMounted = false;
    };
  }, [expanded, race]);

  const findNearestWeather = (sessionTime) => {
    if (!sessionTime || !weatherData || !weatherData.time) return null;
    const targetMs = sessionTime.getTime();

    let bestIdx = -1;
    let minDiff = Infinity;

    for (let i = 0; i < weatherData.time.length; i++) {
      const forecastDate = new Date(weatherData.time[i]);
      const diff = Math.abs(forecastDate.getTime() - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }

    // Match only if the weather forecast is within 3 hours of the session time
    if (minDiff < 3 * 60 * 60 * 1000 && bestIdx !== -1) {
      const airTemp = weatherData.temperature_2m[bestIdx];
      const code = weatherData.weather_code[bestIdx];

      let trackTempDiff = 5;
      if ([0, 1].includes(code)) trackTempDiff = 13;
      else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) trackTempDiff = -2;

      // Determine forecast confidence based on 48-hour window
      const hoursToSession = (sessionTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      const confidence = hoursToSession <= 48 ? 'Live Forecast' : 'Early Outlook';

      return {
        temp: airTemp.toFixed(1),
        trackTemp: (airTemp + trackTempDiff).toFixed(1),
        humidity: weatherData.relative_humidity_2m[bestIdx],
        rainProb: weatherData.precipitation_probability[bestIdx],
        code: code,
        confidence
      };
    }
    return null;
  };

  const getSessionState = (name, rawTime) => {
    if (!now || !rawTime) return 'future';
    return getSharedSessionState(name, rawTime, now);
  };

  const circuit = circuitData[race.Circuit.circuitId] || {
    color: "rgba(50, 50, 50, 1)",
    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&q=80&w=800"
  };

  const baseColor = isNext ? "rgba(225, 6, 0, 1)" : circuit.color;

  useEffect(() => {
    // Client-side timezone formatting (always local timezone)
    const formatTime = (dateStr, timeStr) => {
      if (!timeStr) return 'TBD';
      const date = new Date(`${dateStr}T${timeStr}`);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    };

    const formatTimeObj = (dateStr, timeStr) => {
      if (!timeStr) return null;
      return new Date(`${dateStr}T${timeStr}`);
    };

    const s = [];
    const addSession = (name, dateStr, timeStr, isMain = false) => {
      s.push({
        name,
        formattedTime: formatTime(dateStr, timeStr),
        rawTime: formatTimeObj(dateStr, timeStr),
        isMain
      });
    };

    if (race.FirstPractice) addSession('Free Practice 1', race.FirstPractice.date, race.FirstPractice.time);
    if (race.SecondPractice) addSession('Free Practice 2', race.SecondPractice.date, race.SecondPractice.time);
    if (race.ThirdPractice) addSession('Free Practice 3', race.ThirdPractice.date, race.ThirdPractice.time);
    if (race.SprintQualifying) addSession('Sprint Qualifying', race.SprintQualifying.date, race.SprintQualifying.time);
    if (race.Sprint) addSession('Sprint', race.Sprint.date, race.Sprint.time);
    if (race.Qualifying) addSession('Qualifying', race.Qualifying.date, race.Qualifying.time);
    addSession('Race', race.date, race.time, true);

    const timeout = setTimeout(() => {
      setSessions(s);
    }, 0);
    return () => clearTimeout(timeout);
  }, [race]);

  const raceDate = new Date(`${race.date}T${race.time || '00:00:00Z'}`);
  const raceEndTime = new Date(raceDate.getTime() + 3 * 60 * 60 * 1000);
  const isPast = raceEndTime < new Date();

  const cardClass = `${styles.card} ${isNext ? styles.nextRace : ''} ${isPast ? styles.pastRace : ''}`;

  const fadedColor = baseColor.replace('1)', '0.85)');
  const transparentColor = baseColor.replace('1)', '0)');

  const cardStyle = {
    backgroundImage: `linear-gradient(90deg, ${baseColor} 0%, ${fadedColor} 50%, ${transparentColor} 100%), url('${circuit.image}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'right center',
    backgroundRepeat: 'no-repeat',
    position: 'relative', // Ensure relative positioning for absolute children
    '--circuit-color': baseColor
  };

  return (
    <div className={cardClass} style={cardStyle}>
      <div className={styles.cardInner}>
        <div className={styles.header} onClick={() => setExpanded(!expanded)}>
          <div className={styles.titleInfo}>
            <div className={styles.round}>Round {race.round}</div>
            <h2 className={styles.raceName}>{race.raceName}</h2>
            <p className={styles.circuit}>{race.Circuit.circuitName}</p>
          </div>

          {isNext && (
            <div className={styles.countdownContainer}>
              <Countdown targetDate={raceDate} />
            </div>
          )}
        </div>

        <div className={styles.toggleBar} onClick={() => setExpanded(!expanded)}>
          <span>{sessions.length} Sessions</span>
          <span className={styles.toggleIcon} style={{ display: 'flex', alignItems: 'center' }}>
            <ChevronIcon expanded={expanded} />
          </span>
        </div>

        {expanded && (
          <div className={styles.sessionsList}>
            {sessions.map((session, idx) => {
              const state = getSessionState(session.name, session.rawTime);
              const isCompleted = state === 'completed';
              const isLive = state === 'live';
              const weather = findNearestWeather(session.rawTime);

              return (
                <div
                  key={idx}
                  className={`${styles.sessionItem} ${session.isMain ? styles.mainSession : ''} ${isCompleted ? styles.completedSession : ''} ${isLive ? styles.liveSession : ''}`}
                >
                  <div className={styles.sessionNameContainer}>
                    <span className={styles.sessionName}>{session.name}</span>
                    {isLive && (
                      <span className={styles.liveBadge}>
                        Live
                        <span className={styles.liveDot}></span>
                      </span>
                    )}
                  </div>
                  <div className={styles.sessionTimeContainer}>
                    <span className={styles.sessionTime}>{session.formattedTime}</span>
                    {weather && (
                      <div className={styles.weatherIconContainer}>
                        <WeatherIcon code={weather.code} />
                        <div className={styles.weatherTooltip}>
                          <div className={styles.tooltipTitle}>{session.name} Weather</div>
                          <div className={styles.tooltipConfidence} style={{
                            color: weather.confidence === 'Live Forecast' ? '#39ff14' : '#ffe600'
                          }}>
                            {weather.confidence === 'Live Forecast' ? '● Live Forecast' : '▲ Early Outlook'}
                          </div>
                          <div className={styles.tooltipGrid}>
                            <div className={styles.tooltipItem}>
                              <span>Air Temp</span>
                              <strong>{weather.temp}°C</strong>
                            </div>
                            <div className={styles.tooltipItem}>
                              <span>Track Temp</span>
                              <strong>{weather.trackTemp}°C</strong>
                            </div>
                            <div className={styles.tooltipItem}>
                              <span>Humidity</span>
                              <strong>{weather.humidity}%</strong>
                            </div>
                            <div className={styles.tooltipItem}>
                              <span>Rain Prob</span>
                              <strong>{weather.rainProb}%</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Add to Calendar Button */}
                    {!isCompleted && session.rawTime && (
                      <div
                        className={styles.calendarContainer}
                        ref={(el) => {
                          if (activeCalendarIndex === idx) activeCalendarRef.current = el;
                        }}
                      >
                        <button
                          className={styles.calendarBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCalendarIndex(activeCalendarIndex === idx ? null : idx);
                          }}
                          title="Add to Calendar"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                            <line x1="12" y1="14" x2="12" y2="18" />
                            <line x1="10" y1="16" x2="14" y2="16" />
                          </svg>
                        </button>

                        {activeCalendarIndex === idx && (
                          <div className={styles.calendarPopover} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.popoverTitle}>Add to Calendar</div>
                            <button
                              className={styles.popoverItem}
                              onClick={() => {
                                openGoogleCalendar(session, race);
                                setActiveCalendarIndex(null);
                              }}
                            >
                              Google Calendar
                            </button>
                            <button
                              className={styles.popoverItem}
                              onClick={() => {
                                downloadIcsFile(session, race);
                                setActiveCalendarIndex(null);
                              }}
                            >
                              iCal / Outlook (.ics)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
