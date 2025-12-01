// src/pages/HolidaysCalendarPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/HolidaysCalendarPage.css";
import { toast } from "react-toastify";

const COUNTRY_OPTIONS = [
  { code: "PK", label: "Pakistan" },
  { code: "AE", label: "UAE" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "MY", label: "Malaysia" },
  { code: "QA", label: "Qatar" },
  { code: "UK", label: "UK" },
];

// Helper: YYYY-MM-DD string
const toYmd = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekdaysShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HolidaysCalendarPage = () => {
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedCountry, setSelectedCountry] = useState("");
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializingCountry, setInitializingCountry] = useState(true);

  // ------------ Default country from employee location ------------
  useEffect(() => {
    const init = async () => {
      if (!user || !user.id) {
        setInitializingCountry(false);
        return;
      }

      try {
        const res = await api.get(`/api/holidays/default-country/${user.id}`);
        const code = res.data?.country_code;

        if (
          code &&
          COUNTRY_OPTIONS.some((c) => c.code === String(code).toUpperCase())
        ) {
          setSelectedCountry(String(code).toUpperCase());
        } else {
          // safe fallback
          setSelectedCountry("PK");
        }
      } catch (err) {
        console.error("Error loading default country from location:", err);
        setSelectedCountry("PK");
      } finally {
        setInitializingCountry(false);
      }
    };

    init();
  }, [user]);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth(); // 0-11

  // ------------ Fetch holidays ------------
  const fetchHolidays = async () => {
    if (!selectedCountry) return;
    setLoading(true);
    try {
      const res = await api.get("/api/holidays", {
        params: {
          country_code: selectedCountry,
          year,
          month: monthIndex + 1,
        },
      });
      setHolidays(res.data || []);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Error fetching holidays";
      toast.error(msg); // ✅ alert → toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedCountry) return;
    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, year, monthIndex]);

  // ------------ Derived data ------------
  const holidaysByDate = useMemo(() => {
    const map = {};
    (holidays || []).forEach((h) => {
      const key = (h.holiday_date || "").slice(0, 10);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    return map;
  }, [holidays]);

  const upcomingHolidays = useMemo(() => {
    const today = toYmd(new Date());
    return (holidays || [])
      .filter((h) => (h.holiday_date || "").slice(0, 10) >= today)
      .sort((a, b) =>
        (a.holiday_date || "").slice(0, 10) >
        (b.holiday_date || "").slice(0, 10)
          ? 1
          : -1
      )
      .slice(0, 8);
  }, [holidays]);

  const calendarCells = useMemo(() => {
    const cells = [];

    const firstOfMonth = new Date(year, monthIndex, 1);
    let weekday = firstOfMonth.getDay(); // 0=Sun..6=Sat
    if (weekday === 0) weekday = 7;
    const leadingBlanks = weekday - 1;

    const nextMonth = new Date(year, monthIndex + 1, 0);
    const daysInMonth = nextMonth.getDate();

    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ type: "blank", key: `blank-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthIndex, day);
      const ymd = toYmd(d);
      const dayHolidays = holidaysByDate[ymd] || [];
      const isToday = toYmd(new Date()) === ymd;

      cells.push({
        type: "day",
        key: `day-${ymd}`,
        date: d,
        ymd,
        day,
        isToday,
        holidays: dayHolidays,
      });
    }

    return cells;
  }, [year, monthIndex, holidaysByDate]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isLoadingAll =
    initializingCountry || (!selectedCountry && loading) || loading;

  // ------------ UI ------------
  return (
    <div className="holidays-page-root">
      {/* Blue strip header (same style family as Leaves) */}
      <div className="holidays-page-header">
        <h1>Public Holidays Calendar</h1>
        <p>
          View country-wise public holidays and plan attendance. Employees are
          not marked absent on configured public holidays.
        </p>
      </div>

      {/* Main white card */}
      <div className="holidays-page-card">
        {/* Top controls row (month + country) */}
        <div className="holidays-top-row">
          <div className="holidays-month-switcher">
            <button
              type="button"
              className="holidays-btn-text"
              onClick={handlePrevMonth}
            >
              ‹ Previous
            </button>
            <div className="holidays-month-label">
              {monthNames[monthIndex]} {year}
            </div>
            <button
              type="button"
              className="holidays-btn-text"
              onClick={handleNextMonth}
            >
              Next ›
            </button>
            <button
              type="button"
              className="holidays-btn-link"
              onClick={handleToday}
            >
              Today
            </button>
          </div>

          <div className="holidays-filter-field">
            <label>Country</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {!selectedCountry && (
                <option value="" disabled>
                  Loading...
                </option>
              )}
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar section (matches LeavePage section style) */}
        <section className="holidays-section">
          <h3 className="holidays-section-title">Calendar View</h3>
          <p className="holidays-section-help">
            Public holidays are taken from the national / gazette list for the
            selected country. On these days, employees will not be marked absent
            and no leave will be deducted.
          </p>

          <div className="holidays-layout">
            {/* Calendar grid */}
            <div className="holidays-calendar-wrapper">
              {isLoadingAll && (
                <p className="holidays-loading">Loading holidays...</p>
              )}

              <div className="holidays-weekdays">
                {weekdaysShort.map((w) => (
                  <div key={w} className="holidays-weekday">
                    {w}
                  </div>
                ))}
              </div>

              <div className="holidays-grid">
                {calendarCells.map((cell) =>
                  cell.type === "blank" ? (
                    <div
                      key={cell.key}
                      className="holidays-cell holidays-cell--blank"
                    />
                  ) : (
                    <div
                      key={cell.key}
                      className={[
                        "holidays-cell",
                        cell.isToday ? "holidays-cell--today" : "",
                        cell.holidays.length ? "holidays-cell--holiday" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="holidays-day-number">{cell.day}</div>
                      {cell.holidays.length > 0 && (
                        <div className="holidays-badges">
                          {cell.holidays.slice(0, 2).map((h) => (
                            <span key={h.id} className="holiday-badge">
                              {h.name}
                            </span>
                          ))}
                          {cell.holidays.length > 2 && (
                            <span className="holiday-badge holiday-badge--more">
                              +{cell.holidays.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="holidays-legend">
                <span className="holidays-legend-item">
                  <span className="holidays-legend-dot holidays-legend-dot--today" />
                  Today
                </span>
                <span className="holidays-legend-item">
                  <span className="holidays-legend-dot holidays-legend-dot--holiday" />
                  Public Holiday
                </span>
              </div>
            </div>

            {/* Upcoming holidays side panel */}
            <aside className="holidays-side-panel">
              <h4 className="holidays-upcoming-title">Upcoming Holidays</h4>

              {upcomingHolidays.length === 0 ? (
                <p className="holidays-empty">
                  No upcoming holidays in this range.
                </p>
              ) : (
                <ul className="holidays-upcoming-list">
                  {upcomingHolidays.map((h) => {
                    const d = new Date(h.holiday_date);
                    const label = d.toLocaleDateString(undefined, {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <li key={h.id} className="holidays-upcoming-item">
                        <div className="holidays-upcoming-date">{label}</div>
                        <div className="holidays-upcoming-name">{h.name}</div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="holidays-note">
                Note: These holidays are ignored in late / absent calculations.
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HolidaysCalendarPage;
