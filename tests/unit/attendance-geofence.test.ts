import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateHaversineDistance,
  evaluateGeofence,
} from '../../lib/attendance/geofence-utils.ts'

describe('Attendance Geofence & Haversine Distance Calculation Tests', () => {
  it('1. Returns 0 meters for identical coordinates', () => {
    const d = calculateHaversineDistance(23.7314, 90.4182, 23.7314, 90.4182)
    assert.equal(d, 0)
  })

  it('2. Accurately calculates short workplace distances (e.g. 35m across print shop floor)', () => {
    // Coordinate offset of ~0.0003 degrees latitude is ~33.3 meters
    const locLat = 23.731400
    const locLng = 90.418200
    const userLat = 23.731700
    const userLng = 90.418200

    const distance = calculateHaversineDistance(userLat, userLng, locLat, locLng)
    assert.ok(distance >= 32 && distance <= 35, `Calculated distance ${distance}m should be ~33.4m`)
  })

  it('3. Accurately calculates medium inter-neighborhood distances in Dhaka (Motijheel to Fakirapool ~220m)', () => {
    const fakirapoolLat = 23.7314
    const fakirapoolLng = 90.4182
    const motijheelLat = 23.7330
    const motijheelLng = 90.4195

    const distance = calculateHaversineDistance(motijheelLat, motijheelLng, fakirapoolLat, fakirapoolLng)
    assert.ok(distance >= 200 && distance <= 250, `Distance ${distance}m should be around ~224m`)
  })

  it('4. Accurately calculates long-range distances (Dhaka Motijheel to Dhanmondi ~5.1km)', () => {
    const motijheelLat = 23.7330
    const motijheelLng = 90.4195
    const dhanmondiLat = 23.7538
    const dhanmondiLng = 90.3753

    const distance = calculateHaversineDistance(dhanmondiLat, dhanmondiLng, motijheelLat, motijheelLng)
    assert.ok(distance >= 4900 && distance <= 5300, `Distance ${distance}m should be ~5.1km`)
  })

  it('5. Evaluates geofence boundary pass/fail logic correctly', () => {
    const location = {
      lat: 23.7314,
      lng: 90.4182,
      radius_meters: 100,
      max_accuracy_meters: 50,
    }

    // Punch 1: 45m away (Inside 100m radius, good accuracy 12m) -> PASS
    const res1 = evaluateGeofence({
      userLat: 23.7318,
      userLng: 90.4182,
      userAccuracy: 12,
      locationLat: location.lat,
      locationLng: location.lng,
      radiusMeters: location.radius_meters,
      maxAccuracyMeters: location.max_accuracy_meters,
    })
    assert.equal(res1.isWithinRadius, true)
    assert.equal(res1.isAccuracyAcceptable, true)

    // Punch 2: 420m away (Outside 100m radius) -> FAIL
    const res2 = evaluateGeofence({
      userLat: 23.7350,
      userLng: 90.4200,
      userAccuracy: 15,
      locationLat: location.lat,
      locationLng: location.lng,
      radiusMeters: location.radius_meters,
      maxAccuracyMeters: location.max_accuracy_meters,
    })
    assert.equal(res2.isWithinRadius, false)

    // Punch 3: 30m away but poor GPS accuracy (180m > 50m threshold) -> FAIL
    const res3 = evaluateGeofence({
      userLat: 23.7314,
      userLng: 90.4182,
      userAccuracy: 180,
      locationLat: location.lat,
      locationLng: location.lng,
      radiusMeters: location.radius_meters,
      maxAccuracyMeters: location.max_accuracy_meters,
    })
    assert.equal(res3.isAccuracyAcceptable, false)
  })
})
