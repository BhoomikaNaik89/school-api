const express = require('express');
const pool = require('./db');

const router = express.Router();

function isValidString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidLatitude(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= -90 && num <= 90;
}

function isValidLongitude(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= -180 && num <= 180;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function distanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.post('/addSchool', async (req, res) => {
  try {
    const { name, address, latitude, longitude } = req.body || {};

    if (!isValidString(name)) {
      return res.status(400).json({ error: 'Invalid or missing name' });
    }

    if (!isValidString(address)) {
      return res.status(400).json({ error: 'Invalid or missing address' });
    }

    if (!isValidLatitude(latitude)) {
      return res.status(400).json({ error: 'Invalid or missing latitude' });
    }

    if (!isValidLongitude(longitude)) {
      return res.status(400).json({ error: 'Invalid or missing longitude' });
    }

    const query =
      "INSERT INTO schools (name,address,latitude,longitude) VALUES (?,?,?,?)";

    await pool.query(query, [name, address, latitude, longitude]);

    res.json({ message: "School added successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/listSchools', async (req, res) => {
  try {
    const { latitude, longitude } = req.query || {};

    if (!isValidLatitude(latitude)) {
      return res.status(400).json({ error: 'Invalid or missing latitude query parameter' });
    }
    if (!isValidLongitude(longitude)) {
      return res.status(400).json({ error: 'Invalid or missing longitude query parameter' });
    }

    const userLat = Number(latitude);
    const userLon = Number(longitude);

    const [rows] = await pool.execute('SELECT id, name, address, latitude, longitude FROM schools');

    const withDistance = rows.map((school) => {
      const distanceKm = distanceInKm(
        userLat,
        userLon,
        Number(school.latitude),
        Number(school.longitude)
      );

      return {
        ...school,
        distanceKm: Number(distanceKm.toFixed(3))
      };
    });

    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json(withDistance);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in /listSchools:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

