import assert from 'assert';
import {
  canTransitionCycle,
  canTransitionDevice,
  isCollectionMode,
} from './virtual-ndani/domain';
import {
  GuidedReadingValidationError,
  validateGuidedReading,
} from './virtual-ndani/guidedReading';

assert.equal(canTransitionDevice('reading_due', 'collecting_manual'), true);
assert.equal(canTransitionDevice('reading_due', 'reading_accepted'), false);
assert.equal(canTransitionDevice('suspended', 'ready'), true);

assert.equal(canTransitionCycle('scheduled', 'started'), true);
assert.equal(canTransitionCycle('capturing', 'awaiting_confirmation'), true);
assert.equal(canTransitionCycle('accepted', 'validated'), false);
assert.equal(canTransitionCycle('batched', 'started'), false);

assert.equal(isCollectionMode('manual_guided'), true);
assert.equal(isCollectionMode('manual_agent'), true);
assert.equal(isCollectionMode('manual'), false);
assert.equal(isCollectionMode('made_up'), false);

const acceptedReading = validateGuidedReading({
  soil_moisture: 'moist',
  rain_condition: 'light',
  plant_condition: 'good',
  pest_disease_signs: 'none',
  irrigation: 'no',
});
assert.equal(acceptedReading.qualityStatus, 'accepted');
assert.deepEqual(acceptedReading.riskFlags, []);

const flaggedReading = validateGuidedReading({
  soil_moisture: 'wet',
  rain_condition: 'moderate',
  plant_condition: 'poor',
  pest_disease_signs: 'severe',
  irrigation: 'no',
});
assert.equal(flaggedReading.qualityStatus, 'flagged');
assert.deepEqual(flaggedReading.riskFlags, [
  'poor_plant_condition',
  'severe_pest_or_disease_signs',
]);

assert.throws(
  () => validateGuidedReading({
    soil_moisture: '63_percent',
    rain_condition: 'none',
    plant_condition: 'good',
    pest_disease_signs: 'none',
    irrigation: 'no',
  }),
  (error: unknown) => (
    error instanceof GuidedReadingValidationError
    && error.code === 'invalid_soil_moisture'
  )
);

console.log('✅ Virtual Ndani Kit domain state and vocabulary tests passed');
