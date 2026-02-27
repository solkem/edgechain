# Freedom Node: Ubuntu Server 24.04 LTS Installation Guide

**Hardware:** Dell OptiPlex 7060 Micro (i5-8500T, 16GB RAM, 256GB NVMe)  
**Target OS:** Ubuntu Server 24.04.x LTS  
**Purpose:** Midnight Network proof server (Docker + Halo2 ZK proving)  
**Date:** February 2026

---

## Prerequisites

### What You Need

| Item | Notes |
|------|-------|
| Dell OptiPlex 7060 Micro | Amazon Renewed unit (ships with Windows 11) |
| USB flash drive (8GB+) | Will be wiped — back up anything on it |
| Monitor + **DisplayPort** cable (or DP→HDMI adapter) | Temporary — only needed during install. OptiPlex 7060 Micro has 2x DisplayPort, **no HDMI**. |
| USB keyboard | Temporary — only needed during install |
| Ethernet cable OR WiFi network | For downloading packages during install |
| Another computer | To create the bootable USB |

### What You'll Download

- **Ubuntu Server 24.04.x LTS ISO** (~2.6 GB)
- **Rufus** (Windows) or **balenaEtcher** (Mac/Linux) — USB flashing tool

---

## Phase 1: Create Bootable USB

### Step 1 — Download Ubuntu Server ISO

On your other computer:

1. Go to: **https://ubuntu.com/download/server**
2. Download **Ubuntu Server 24.04.x LTS** (the latest 24.04 point release)
3. Save the `.iso` file — note where it downloads

### Step 2 — Flash the ISO to USB

**On Windows (Rufus):**

1. Download Rufus from **https://rufus.ie**
2. Insert your USB drive
3. Open Rufus
4. **Device:** Select your USB drive
5. **Boot selection:** Click `SELECT` → choose the Ubuntu ISO
6. **Partition scheme:** GPT
7. **Target system:** UEFI (non CSM)
8. Click `START` → accept any prompts
9. Wait for completion (~5 minutes)

**On Mac/Linux (balenaEtcher):**

1. Download from **https://etcher.balena.io**
2. Open Etcher
3. Click `Flash from file` → select the Ubuntu ISO
4. Click `Select target` → choose your USB drive
5. Click `Flash!`
6. Wait for completion

---

## Phase 2: Configure BIOS on OptiPlex 7060

### Step 3 — Enter BIOS Setup

1. Connect monitor, keyboard, and power to the OptiPlex
2. Power on the machine
3. Immediately press **F2** repeatedly until BIOS appears
   - If you see Windows boot, power off and try again — tap F2 faster

### Step 4 — BIOS Settings to Change

Navigate through the BIOS menus and make these changes:

**General → Boot Sequence:**
- Confirm **UEFI** boot mode is enabled (not Legacy)

**General → Advanced Boot Options:**
- **Enable Legacy Option ROMs:** Disabled (leave disabled)

**System Configuration → SATA Operation:**
- Set to **AHCI** (should already be AHCI — do NOT change if it says RAID)

**Secure Boot → Secure Boot Enable:**
- Set to **Disabled**
- Ubuntu can work with Secure Boot enabled, but disabling avoids potential driver issues with LTE modem and LoRa USB-UART later

**Power Management → AC Recovery:**
- Set to **Power On**
- Critical for Freedom Node: if power drops and returns (solar intermittency), the machine auto-restarts without human intervention

**Power Management → Wake on LAN:**
- Set to **Disabled** (not needed; saves power)

### Step 5 — Save and Exit

1. Press **Apply** or **F10** to save
2. Confirm save
3. Machine will reboot

---

## Phase 3: Boot from USB

### Step 6 — Access Boot Menu

1. Insert the Ubuntu USB drive into any USB port on the OptiPlex
2. Power on (or reboot)
3. Immediately press **F12** repeatedly to open the one-time boot menu
4. Select your USB drive from the list (it may show as the drive brand name or "UEFI: USB...")
5. Press Enter

### Step 7 — Ubuntu Installer Loads

1. You'll see a GRUB menu — select **Try or Install Ubuntu Server**
2. Wait for the installer to load (may take 30-60 seconds)

---

## Phase 4: Ubuntu Server Installation

### Step 8 — Language and Keyboard

1. **Language:** English
2. **Keyboard layout:** English (US) — or your preference
3. Select `Done`

### Step 9 — Installation Type

1. Select **Ubuntu Server** (not minimized)
2. Select `Done`

### Step 10 — Network Configuration

The installer will auto-detect network interfaces.

**If using Ethernet:**
- It should auto-configure via DHCP
- Verify you see an IP address (e.g., `192.168.x.x`)

**If using WiFi:**
- Select the WiFi adapter
- Choose your network, enter password
- Note: WiFi on OptiPlex 7060 Micro requires the optional WiFi card — if not installed, use Ethernet

Select `Done`

### Step 11 — Proxy Configuration

- Leave blank (unless you're behind a corporate proxy)
- Select `Done`

### Step 12 — Ubuntu Archive Mirror

- Accept the default mirror (auto-detected based on location)
- Select `Done`

### Step 13 — Storage Configuration

**This is the critical step — you're wiping the Windows 11 install.**

1. Select **Use an entire disk**
2. Select the 256GB NVMe drive
3. **Set up this disk as an LVM group:** Yes (leave checked)
   - LVM allows flexible partition resizing later
4. **Encrypt the LVM group with LUKS:** No
   - Skip encryption — Freedom Node needs to auto-boot unattended after power loss. Disk encryption requires a passphrase at every boot, which breaks the solar recovery scenario.

5. Review the storage layout:
   ```
   /boot/efi  — 512 MB (EFI System Partition)
   /boot      — ~1.8 GB (ext4)
   /           — remainder (~250 GB, ext4 on LVM)
   ```

6. Select `Done`
7. **Confirm destructive action** → Select `Continue`

> **Why no encryption:** The Freedom Node must survive power cycles unattended. In rural Zimbabwe on solar power, the machine needs to boot straight to a working state without human passphrase entry. Wallet key security is handled at the application layer (ATECC608B on the sensor, not the proof server).

### Step 14 — Profile Setup

| Field | Value | Notes |
|-------|-------|-------|
| **Your name** | `solomon` | Or your preferred display name |
| **Your server's name** | `freedom-node-01` | Hostname — increment for multiple nodes |
| **Pick a username** | `solomon` | Login username |
| **Choose a password** | (strong password) | You'll need this for SSH and sudo |
| **Confirm password** | (same) | |

Select `Done`

> **Naming convention for scale:** `freedom-node-01`, `freedom-node-02`, etc. When you deploy 47+ nodes, this naming matters for monitoring.

### Step 15 — Ubuntu Pro

- Skip — select **Skip for now**
- Select `Continue`

### Step 16 — SSH Setup

1. **Install OpenSSH server:** Yes (check this box)
   - This is essential — SSH is how you'll manage the node remotely
2. **Import SSH identity:** Skip for now (you'll configure keys manually)
3. Select `Done`

### Step 17 — Featured Server Snaps

**Do NOT install any snaps here.** We'll install Docker properly in the next phase.

- Leave everything unchecked
- Select `Done`

### Step 18 — Installation Runs

- The installer will download packages and install the system
- This takes 5-15 minutes depending on internet speed
- When complete, you'll see **Reboot Now**

### Step 19 — Reboot

1. Select **Reboot Now**
2. When prompted, remove the USB drive and press Enter
3. The system will reboot into Ubuntu Server

---

## Phase 5: First Boot Configuration

### Step 20 — Login

1. At the login prompt, enter your username and password
2. You should see a command prompt:
   ```
   solomon@freedom-node-01:~$
   ```

### Step 21 — Update the System

```bash
sudo apt update && sudo apt upgrade -y
```

This may take a few minutes. Reboot if kernel updates were applied:

```bash
sudo reboot
```

### Step 21b — Expand LVM to Use Full Disk

Ubuntu Server's default LVM install only allocates ~100GB to the root volume, even on a 256GB drive. Fix this:

```bash
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv
```

Verify:
```bash
df -h /
```

Should show ~230-240GB available (not 98GB).

### Step 21c — Set Static IP Address

A DHCP lease can change after a power cycle — you'd lose SSH access to a headless node. Set a static IP now.

First, identify your network interface name and current IP:

```bash
ip addr show
```

Look for the active interface (likely `eno1` for Ethernet). Note the current IP and subnet.

Find your gateway:
```bash
ip route | grep default
```

Edit the Netplan config:

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

Replace the contents with (adjust values to match your network):

```yaml
network:
  version: 2
  ethernets:
    eno1:                          # your interface name from ip addr
      dhcp4: no
      addresses:
        - 192.168.1.100/24         # pick an IP outside your router's DHCP range
      routes:
        - to: default
          via: 192.168.1.1         # your gateway from ip route
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
```

Apply and verify:

```bash
sudo netplan apply
ping -c 3 google.com
```

> **Choosing the IP:** Most home routers assign DHCP in the range .100-.254. Pick something in .10-.50 to avoid conflicts (e.g., `192.168.1.20`). For field deployment in Zimbabwe, the static IP will be set relative to whatever LTE or local network is in use.

### Step 22 — Set Timezone

```bash
sudo timedatectl set-timezone UTC
```

> **Why UTC (not Africa/Harare):** All Freedom Nodes should log in UTC regardless of physical location. Epoch-based nullifiers and attestation timestamps need consistent time references across nodes. Local display time is irrelevant for a headless server.

### Step 23 — Verify Hardware

Confirm the system sees your hardware correctly:

```bash
# CPU — should show i5-8500T, 6 cores, 12 threads
lscpu | grep -E "Model name|CPU\(s\)|Thread"

# RAM — should show ~16GB
free -h

# Disk — should show ~250GB available
df -h /

# USB ports — for later LoRa and LTE connections
lsusb
```

### Step 24 — Install Essential Packages

```bash
sudo apt install -y \
  curl \
  wget \
  git \
  htop \
  net-tools \
  usbutils \
  screen \
  ufw \
  ca-certificates \
  gnupg \
  lsb-release \
  picocom \
  unzip
```

| Package | Why |
|---------|-----|
| `curl`, `wget` | HTTP tools for downloads |
| `git` | Clone repos, version control |
| `htop` | Monitor CPU/RAM during ZK proving |
| `net-tools` | `ifconfig`, network diagnostics |
| `usbutils` | `lsusb` for verifying LoRa + LTE dongles |
| `screen` | Persistent terminal sessions over SSH |
| `ufw` | Firewall |
| `ca-certificates`, `gnupg`, `lsb-release` | Docker prerequisites |
| `picocom` | Serial terminal for LoRa AT commands |
| `unzip` | Required by Compact compiler installer |

### Step 25 — Configure Firewall

```bash
# Allow SSH
sudo ufw allow OpenSSH

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status
```

Output should show:
```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
```

> **Later additions:** When Docker and Midnight proof server are configured, you'll open additional ports as needed.

### Step 26 — Configure SSH Key Authentication (from your dev machine)

On your **development machine** (not the Freedom Node):

```bash
# Generate key pair if you don't have one
ssh-keygen -t ed25519 -C "solomon@freedom-node"

# Copy public key to the Freedom Node
# Replace IP with the node's actual IP address
ssh-copy-id solomon@<FREEDOM_NODE_IP>
```

Then on the **Freedom Node**, disable password authentication:

```bash
sudo nano /etc/ssh/sshd_config
```

Find and change these lines:
```
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:
```bash
sudo systemctl restart ssh
```

> **Test SSH access from your dev machine before closing the current session.** If you lock yourself out, you'll need the physical monitor and keyboard again.

### Step 27 — Enable Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Select **Yes** when prompted. This ensures security patches apply automatically — critical for a node that may run unattended for weeks.

### Step 28 — Install Tailscale

Tailscale creates a persistent mesh VPN overlay. This is critical for the Freedom Node because:

- **LTE in Zimbabwe** puts the node behind carrier-grade NAT — no inbound connections possible
- **Static IP only helps on the local network** — useless once the node is in the field
- **Tailscale gives a stable IP (100.x.x.x)** reachable from your dev machine anywhere in the world
- **SSH over Tailscale** works even when the node changes networks or LTE modems

Install:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

Start and authenticate:

```bash
sudo tailscale up --ssh
```

This prints a URL. Open it on your dev machine's browser to authenticate with your Tailscale account. If you don't have one, create a free account at **https://login.tailscale.com** first.

Once authenticated, get the Tailscale IP:

```bash
tailscale ip -4
```

Note this IP (e.g., `100.64.x.x`) — this is your persistent remote access address.

Verify from your **dev machine** (which also needs Tailscale installed):

```bash
ssh solomon@<TAILSCALE_IP>
```

Configure Tailscale to start on boot:

```bash
sudo systemctl enable tailscaled
```

**Tailscale SSH (optional but recommended):**

The `--ssh` flag in `tailscale up` enables Tailscale SSH, which uses your Tailscale identity instead of SSH keys. This means you can access the node from any Tailscale-authenticated device without distributing SSH keys. You can manage access via the Tailscale admin console at **https://login.tailscale.com/admin/machines**.

> **Key expiry:** By default, Tailscale keys expire after 180 days and require re-authentication — which means physical access or console access to run `tailscale up` again. To prevent this for a headless node:
> 1. Go to **https://login.tailscale.com/admin/machines**
> 2. Find `freedom-node-01`
> 3. Click the **⋮** menu → **Disable key expiry**
>
> Do this immediately after registration. A node in rural Zimbabwe cannot re-authenticate itself.

### Step 29 — Verify Remote Access Stack

At this point you have three layers of remote access:

| Method | When it works | IP |
|--------|--------------|-----|
| Local SSH | Same network (dev/testing in MD) | Static IP (e.g., `192.168.1.20`) |
| Tailscale SSH | Anywhere with internet (field deployment) | `100.x.x.x` |
| Physical console | Last resort (monitor + keyboard) | N/A |

Confirm both work before proceeding:

```bash
# From dev machine — local
ssh solomon@192.168.1.20

# From dev machine — Tailscale
ssh solomon@<TAILSCALE_IP>
```

---

## Phase 6: Install Docker

### Step 30 — Add Docker Repository

```bash
# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### Step 31 — Install Docker Engine

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Step 32 — Add Your User to Docker Group

```bash
sudo usermod -aG docker $USER
```

**Log out and back in** for the group change to take effect:

```bash
exit
# SSH back in, or login again at the console
```

### Step 33 — Verify Docker

```bash
docker run hello-world
```

You should see:
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

### Step 34 — Configure Docker to Start on Boot

```bash
sudo systemctl enable docker
sudo systemctl enable containerd
```

---

## Phase 7: Verify Readiness

### Step 35 — System Checklist

Run this verification script:

```bash
echo "=== Freedom Node Readiness Check ==="
echo ""
echo "--- OS ---"
lsb_release -d
echo ""
echo "--- Hostname ---"
hostname
echo ""
echo "--- CPU ---"
lscpu | grep "Model name"
echo "Cores: $(nproc)"
echo ""
echo "--- RAM ---"
free -h | grep Mem
echo ""
echo "--- Disk ---"
df -h / | tail -1
echo ""
echo "--- Docker ---"
docker --version
echo ""
echo "--- SSH ---"
systemctl is-active ssh
echo ""
echo "--- Firewall ---"
sudo ufw status | head -3
echo ""
echo "--- Tailscale ---"
tailscale ip -4 2>/dev/null || echo "Not connected"
echo ""
echo "--- Timezone ---"
timedatectl | grep "Time zone"
echo ""
echo "--- Auto-updates ---"
systemctl is-active unattended-upgrades
echo ""
echo "=== Check Complete ==="
```

**Expected output:**

```
=== Freedom Node Readiness Check ===

--- OS ---
Description:    Ubuntu 24.04.x LTS

--- Hostname ---
freedom-node-01

--- CPU ---
Model name:     Intel(R) Core(TM) i5-8500T CPU @ 2.10GHz
Cores: 6

--- RAM ---
Mem:            15Gi ...

--- Disk ---
/dev/mapper/...  245G  ...

--- Docker ---
Docker version 27.x.x ...

--- SSH ---
active

--- Firewall ---
Status: active

--- Tailscale ---
100.x.x.x

--- Timezone ---
Time zone: UTC (UTC, +0000)

--- Auto-updates ---
active

=== Check Complete ===
```

### Step 36 — Note the IP Address

```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Write this down — you'll need it for SSH access after disconnecting the monitor.

### Step 37 — Disconnect Monitor and Keyboard

Once SSH access is confirmed working from your dev machine, you can disconnect the monitor and keyboard. The Freedom Node is now a headless server.

---

## What's Next

With Ubuntu Server installed and Docker ready, the next steps are:

| Step | Description | Status |
|------|-------------|--------|
| 1 | Wire RYLR896 → CP2102 and test AT commands | Waiting for CP2102 delivery |
| 2 | Configure Huawei E3372-325 LTE modem | Waiting for modem delivery |
| 3 | Pull and test Midnight proof server Docker image | Needs testnet access |
| 4 | Benchmark Halo2 ZK proving on i5-8500T | After Docker + Midnight |
| 5 | Build LoRa listener daemon | After LoRa hardware verified |
| 6 | End-to-end attestation: sensor → proof → chain | Integration milestone |

---

## Troubleshooting

### OptiPlex won't boot from USB
- Re-enter BIOS (F2) and confirm Secure Boot is disabled
- Try a different USB port (use the rear ports, not front)
- Re-flash the USB with Rufus in GPT/UEFI mode

### No network during install
- Use Ethernet if WiFi isn't available (OptiPlex 7060 Micro may not have WiFi card)
- Check cable connection
- The install can proceed without network but won't download updates

### "LVM group already exists" error
- The Amazon Renewed unit may have existing partitions
- Select "Use an entire disk" and confirm the destructive action
- If issues persist, use the installer's manual partitioning to delete all existing partitions first

### SSH connection refused after install
- Verify SSH is running: `sudo systemctl status ssh`
- Verify firewall allows SSH: `sudo ufw status`
- Verify IP address: `ip addr show`

### AC Recovery not working (doesn't auto-start after power loss)
- Re-enter BIOS → Power Management → AC Recovery → set to **Power On**
- Some Renewed units may have this reset to "Last State" — explicitly set to "Power On"

---

*Document Version: 1.0 — February 2026*  
*Part of: Msingi Freedom Node Documentation*
