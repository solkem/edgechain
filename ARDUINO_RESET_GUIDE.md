# Arduino BLE Device Reset Guide

## Understanding the Problem

When you try to reset your Arduino BLE device to connect it to a different wallet, you encounter this issue:

**The device keeps the same cryptographic identity even after database reset!**

### Why This Happens

1. **Arduino generates deterministic keys** from:
   - Hardware serial number (burned into chip, never changes)
   - Salt string: `"EdgeChain-Device-Seed-v2"`

2. **Same inputs = same outputs**:
   ```
   device_pubkey = SHA256(hardware_serial + "EdgeChain-Device-Seed-v2")
   ```

3. **Database reset doesn't affect Arduino**:
   - Resetting the database only removes server-side registration
   - Arduino still broadcasts the same `device_pubkey`
   - Server might reject it as "already registered" or have stale references

### The Salt Solution

The **salt** (`"EdgeChain-Device-Seed-v2"`) is the key to generating a new identity!

## How to Reset Arduino for New Wallet

### Method 1: Change the Salt (Recommended)

**Location:** `arduino/edgechain_iot/edgechain_iot.ino:76`

**Current code:**
```cpp
hasher.update((const uint8_t*)"EdgeChain-Device-Seed-v2", 24);
```

**Change to:**
```cpp
hasher.update((const uint8_t*)"EdgeChain-Device-Seed-v3", 24);
```

Or use any unique string:
```cpp
hasher.update((const uint8_t*)"EdgeChain-Demo-2024-11-15", 25);
hasher.update((const uint8_t*)"MyCustomSalt-12345", 18);
```

**Steps:**
1. Open `arduino/edgechain_iot/edgechain_iot.ino` in Arduino IDE
2. Find line 76
3. Change `v2` to `v3` (or any new version)
4. Update the length if you change the string length (24 → new length)
5. Upload to Arduino
6. Arduino will now have a completely new public key!

### Method 2: Complete Environment Reset

Run the complete reset procedure:

```bash
# 1. Run the reset script
./reset-demo.sh

# 2. Change Arduino salt (see Method 1 above)

# 3. Clear browser localStorage
# Open DevTools (F12) → Console → Run:
localStorage.clear()

# 4. Restart backend server
cd server && npm run dev

# 5. Re-upload Arduino sketch
# Open Arduino IDE → Upload
```

## Database Reset Script Improvements

The reset script now:
- ✅ Checkpoints WAL files before deletion
- ✅ Removes all SQLite files (`.db`, `.db-shm`, `.db-wal`)
- ✅ Provides Arduino reset instructions
- ✅ Optionally kills running server

**Usage:**
```bash
./reset-demo.sh
```

## Verification

After reset, verify the new identity:

1. **Open Arduino Serial Monitor** (115200 baud)
2. Look for output:
   ```
   [KEY GENERATION]
   Hardware Serial: <unique_to_your_chip>
   Device Public Key: <NEW_KEY_HERE>
   Device ID: EDGECHAIN_XXXXXXXX
   ```

3. **The public key should be different** from before!

## Technical Details

### Key Generation Process

```cpp
// Step 1: Get hardware serial (never changes)
uint8_t hwSerial[8];
getHardwareSerial(hwSerial);

// Step 2: Hash with salt (THIS is what you change)
SHA256 hasher;
hasher.update(hwSerial, 8);
hasher.update((const uint8_t*)"EdgeChain-Device-Seed-v2", 24);  // ← SALT
hasher.finalize(device_secret_key, 32);

// Step 3: Derive public key
Ed25519::derivePublicKey(device_public_key, device_secret_key);
```

### Database Schema

The device registration is stored in:

```sql
CREATE TABLE devices (
  device_pubkey TEXT PRIMARY KEY,      -- ← This must change!
  owner_wallet TEXT NOT NULL,          -- ← Your Lace wallet
  collection_mode TEXT NOT NULL,
  registration_epoch INTEGER NOT NULL,
  expiry_epoch INTEGER NOT NULL,
  ...
);
```

### Why Registration Fails

When `device_pubkey` stays the same:
- SQLite PRIMARY KEY constraint prevents duplicate registration
- Or existing registration has wrong `owner_wallet`
- Database might have stale data in WAL files

## Troubleshooting

### Problem: "Device already registered"

**Solution:**
1. Run `./reset-demo.sh` and say yes
2. Change Arduino salt to new version
3. Re-upload Arduino sketch
4. Try registering again

### Problem: Reset script doesn't work

**Check:**
```bash
# Verify all DB files are gone
ls -la server/data/
# Should show: No such file or directory

# Manually delete if needed
rm -f server/data/edgechain.db*
```

### Problem: Arduino shows same public key

**Cause:** You didn't re-upload the sketch after changing the salt

**Solution:**
1. Verify you saved the `.ino` file
2. Click "Upload" in Arduino IDE
3. Wait for "Done uploading"
4. Press reset button on Arduino
5. Check Serial Monitor for new key

## Security Note

**Why is the salt hardcoded?**

In production IoT deployments, you might:
- Use a random salt stored in EEPROM
- Allow dynamic salt injection via BLE configuration mode
- Use device-specific hardware RNG seeds

For this demo, changing the salt in code works perfectly for testing different wallet associations!

## Quick Reference

| Goal | Action |
|------|--------|
| Connect to different wallet | Change salt + reset database |
| Test new device identity | Change salt + re-upload |
| Clear all demo data | Run `./reset-demo.sh` |
| Verify new identity | Check Serial Monitor output |

---

**TL;DR:** Change `"EdgeChain-Device-Seed-v2"` to `"EdgeChain-Device-Seed-v3"` in the Arduino code at line 76, re-upload, and you'll have a brand new device identity! 🎉
