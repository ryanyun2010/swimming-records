DELETE FROM record_progressions;

-- Individual PR (results + leg 1)
INSERT INTO record_progressions (school_record, type, swimmer_id, relay_id, event_id, result_id, meet_id, leg_id, time_ms)
SELECT 0, 'individual', swimmer_id, NULL, event_id, result_id, meet_id, leg_id, time_ms
FROM (
  SELECT *,
         MIN(time_ms) OVER (
           PARTITION BY swimmer_id, event_id
           ORDER BY date, time_ms, id
         ) AS running_best
  FROM (
    SELECT r.id,
           r.swimmer_id,
           r.event_id,
           r.meet_id,
           r.time_ms,
           r.id AS result_id,
           NULL AS leg_id,
           m.date
    FROM results r
    JOIN meets m ON r.meet_id = m.id
    WHERE r.is_valid = 1

    UNION ALL

    SELECT rl.id,
           rl.swimmer_id,
           rl.event_id,
           rel.meet_id,
           rl.split_time AS time_ms,
           NULL AS result_id,
           rl.id AS leg_id,
           m.date
    FROM relay_legs rl
    JOIN relays rel ON rl.relay_id = rel.id
    JOIN meets m ON rel.meet_id = m.id
    WHERE rl.is_valid = 1
      AND rl.leg_order = 1
  )
)
WHERE time_ms = running_best;

-- Individual SR (results + leg 1)
INSERT INTO record_progressions (school_record, type, swimmer_id, relay_id, event_id, result_id, meet_id, leg_id, time_ms)
SELECT 1, 'individual', swimmer_id, NULL, event_id, result_id, meet_id, leg_id, time_ms
FROM (
  SELECT *,
         MIN(time_ms) OVER (
           PARTITION BY event_id
           ORDER BY date, time_ms, id
         ) AS running_best
  FROM (
    SELECT r.id,
           r.swimmer_id,
           r.event_id,
           r.meet_id,
           r.time_ms,
           r.id AS result_id,
           NULL AS leg_id,
           m.date
    FROM results r
    JOIN meets m ON r.meet_id = m.id
    WHERE r.is_valid = 1

    UNION ALL

    SELECT rl.id,
           rl.swimmer_id,
           rl.event_id,
           rel.meet_id,
           rl.split_time AS time_ms,
           NULL AS result_id,
           rl.id AS leg_id,
           m.date
    FROM relay_legs rl
    JOIN relays rel ON rl.relay_id = rel.id
    JOIN meets m ON rel.meet_id = m.id
    WHERE rl.is_valid = 1
      AND rl.leg_order = 1
  )
)
WHERE time_ms = running_best;

-- Relay leg PR (legs 2–4)
INSERT INTO record_progressions (school_record, type, swimmer_id, relay_id, event_id, result_id, meet_id, leg_id, time_ms)
SELECT 0, 'relay_leg', swimmer_id, NULL, event_id, NULL, meet_id, id, split_time
FROM (
  SELECT *,
         MIN(split_time) OVER (
           PARTITION BY r.swimmer_id, r.event_id
           ORDER BY m.date, r.split_time, r.id
         ) AS running_best
  FROM relay_legs AS r
  JOIN relays AS rel ON r.relay_id = rel.id
  JOIN meets AS m ON rel.meet_id = m.id
  WHERE r.is_valid = 1
    AND r.leg_order != 1
)
WHERE split_time = running_best;

-- Relay leg SR (legs 2–4)
INSERT INTO record_progressions (school_record, type, swimmer_id, relay_id, event_id, result_id, meet_id, leg_id, time_ms)
SELECT 1, 'relay_leg', swimmer_id, NULL, event_id, NULL, meet_id, id, split_time
FROM (
  SELECT *,
         MIN(split_time) OVER (
           PARTITION BY r.event_id
           ORDER BY m.date, r.split_time, r.id
         ) AS running_best
  FROM relay_legs AS r
  JOIN relays AS rel ON r.relay_id = rel.id
  JOIN meets AS m ON rel.meet_id = m.id
  WHERE r.is_valid = 1
    AND r.leg_order != 1
)
WHERE split_time = running_best;

-- Relay TEAM PR
INSERT INTO record_progressions (school_record, type, swimmer_id, relay_id, event_id, result_id, meet_id, leg_id, time_ms)
SELECT 0, 'relay', NULL, relay_id, event_id, NULL, meet_id, NULL, time_ms
FROM (
  SELECT r.id AS relay_id,
         r.event_id,
         r.meet_id,
         r.time_ms,
         m.date,
         MIN(r.time_ms) OVER (
           PARTITION BY r.event_id
           ORDER BY m.date, r.time_ms, r.id
         ) AS running_best
  FROM relays r
  JOIN meets m ON r.meet_id = m.id
  WHERE r.is_valid = 1
)
WHERE time_ms = running_best;

-- Relay TEAM SR
INSERT INTO record_progressions (school_record, type, swimmer_id, relay_id, event_id, result_id, meet_id, leg_id, time_ms)
SELECT 1, 'relay', NULL, relay_id, event_id, NULL, meet_id, NULL, time_ms
FROM (
  SELECT r.id AS relay_id,
         r.event_id,
         r.meet_id,
         r.time_ms,
         m.date,
         MIN(r.time_ms) OVER (
           PARTITION BY r.event_id
           ORDER BY m.date, r.time_ms, r.id
         ) AS running_best
  FROM relays r
  JOIN meets m ON r.meet_id = m.id
  WHERE r.is_valid = 1
)
WHERE time_ms = running_best;

