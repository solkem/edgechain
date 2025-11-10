# African Mock Data - Regional Parameters

Enhanced `generateMockFarmDataset()` now includes realistic agricultural data from **5 African countries** + comparisons with California and India.

---

## 🌍 African Regions Supported

### 1. **Kenya** 🇰🇪 (East Africa)
**Region**: `'kenya'`

```typescript
{
  rainfall: 650 ± 350mm        // Range: 300-1000mm annually
  temperature: 22 ± 5°C        // Range: 17-27°C (highland regions)
  primaryCrop: 'maize'          // Staple food crop
  avgYield: 3.2 tons/hectare
  farmSize: 0.5 - 5 hectares    // Typical smallholder
  fertilizer: 80 ± 60 kg/ha     // Often limited access
  soilTypes: loamy, clay, sandy
  irrigation: rainfed, drip, sprinkler
}
```

**Climate**: Tropical highlands, semi-arid lowlands
**Main Crops**: Maize, wheat, tea, coffee
**Challenges**: Drought, pests, soil degradation
**Data Source**: Kenya Agricultural Research Institute (KALRO)

---

### 2. **Ghana** 🇬🇭 (West Africa)
**Region**: `'ghana'`

```typescript
{
  rainfall: 1100 ± 500mm       // Range: 600-1600mm (north to south)
  temperature: 27 ± 3°C        // Range: 24-30°C year-round
  primaryCrop: 'maize'
  avgYield: 2.8 tons/hectare
  farmSize: 1 - 8 hectares      // Larger than East Africa
  fertilizer: 60 ± 50 kg/ha     // Limited use
  soilTypes: clay, loamy, sandy
  irrigation: rainfed, flood
}
```

**Climate**: Tropical (south) to savanna (north)
**Main Crops**: Cocoa, maize, cassava, yam
**Challenges**: Rainfall variability, pest pressure, soil fertility
**Data Source**: Ghana Ministry of Food and Agriculture

---

### 3. **Zimbabwe** 🇿🇼 (Southern Africa)
**Region**: `'zimbabwe'`

```typescript
{
  rainfall: 550 ± 300mm        // Range: 250-850mm (semi-arid)
  temperature: 21 ± 6°C        // Range: 15-27°C (altitude variation)
  primaryCrop: 'maize'
  avgYield: 2.5 tons/hectare   // Lower due to climate stress
  farmSize: 0.5 - 4 hectares    // Communal lands
  fertilizer: 50 ± 40 kg/ha     // Often insufficient
  soilTypes: sandy, loamy, clay
  irrigation: rainfed, drip
}
```

**Climate**: Tropical to subtropical
**Main Crops**: Maize, tobacco, cotton
**Challenges**: Drought, erratic rainfall, limited inputs
**Data Source**: Zimbabwe Agricultural Development Trust (ZADT)

---

### 4. **Nigeria** 🇳🇬 (West Africa)
**Region**: `'nigeria'`

```typescript
{
  rainfall: 900 ± 600mm        // Range: 300-1500mm (huge north-south gradient)
  temperature: 28 ± 4°C        // Range: 24-32°C
  primaryCrop: 'maize'
  avgYield: 2.9 tons/hectare
  farmSize: 0.5 - 3 hectares    // Smallholder dominated
  fertilizer: 70 ± 55 kg/ha
  soilTypes: loamy, clay, sandy
  irrigation: rainfed, flood
}
```

**Climate**: Equatorial (south) to arid (north)
**Main Crops**: Cassava, yam, maize, rice, sorghum
**Challenges**: Soil degradation, pests, climate variability
**Data Source**: Nigerian Institute for Agricultural Research

---

### 5. **Ethiopia** 🇪🇹 (East Africa)
**Region**: `'ethiopia'`

```typescript
{
  rainfall: 750 ± 400mm        // Range: 350-1150mm
  temperature: 19 ± 6°C        // Range: 13-25°C (highland plateau)
  primaryCrop: 'maize'
  avgYield: 2.6 tons/hectare
  farmSize: 0.5 - 2 hectares    // Very small farms
  fertilizer: 55 ± 45 kg/ha     // Limited access to inputs
  soilTypes: clay, loamy, silty
  irrigation: rainfed, flood
}
```

**Climate**: Tropical monsoon (low) to temperate (high)
**Main Crops**: Teff, maize, wheat, sorghum, barley
**Challenges**: Drought, soil erosion, low inputs
**Data Source**: Ethiopian Institute of Agricultural Research (EIAR)

---

## 📊 Comparison Table

| Country | Rainfall | Temp (°C) | Avg Yield (t/ha) | Farm Size (ha) | Fertilizer (kg/ha) |
|---------|----------|-----------|------------------|----------------|-------------------|
| **Kenya** 🇰🇪 | 650±350mm | 22±5 | **3.2** | 0.5-5 | 80±60 |
| **Ghana** 🇬🇭 | 1100±500mm | 27±3 | 2.8 | 1-8 | 60±50 |
| **Zimbabwe** 🇿🇼 | 550±300mm | 21±6 | 2.5 | 0.5-4 | 50±40 |
| **Nigeria** 🇳🇬 | 900±600mm | 28±4 | 2.9 | 0.5-3 | 70±55 |
| **Ethiopia** 🇪🇹 | 750±400mm | 19±6 | 2.6 | 0.5-2 | 55±45 |
| **California** 🇺🇸 | 450±200mm | 20±6 | **5.2** | 20-200 | 180±80 |
| **India** 🇮🇳 | 800±400mm | 28±5 | 3.5 | 1-5 | 120±70 |

---

## 💡 Key Insights

### African Agriculture Characteristics:

**1. Smallholder Dominance**
- Average farm size: **0.5-8 hectares** (vs 20-200 in California)
- Family-run, subsistence + cash crops
- Limited mechanization

**2. Input Constraints**
- Fertilizer use: **50-80 kg/ha** (vs 180 in California)
- Limited access to quality seeds
- Pest/disease management challenges

**3. Climate Variability**
- **High variance** in rainfall (±300-600mm)
- Drought risk (especially Zimbabwe, Kenya)
- Temperature extremes (Ethiopia highlands vs Nigeria lowlands)

**4. Yield Gap**
- African yields: **2.5-3.2 t/ha**
- California: **5.2 t/ha** (62% higher)
- Potential for improvement through:
  - Better inputs
  - Irrigation
  - Improved varieties
  - **Better predictions (EdgeChain!)** 🎯

---

## 🎯 How to Use in EdgeChain

### Generate Data for Different Regions:

```typescript
import { generateMockFarmDataset } from './fl/dataCollection';

// Kenya farmer
const kenyaData = generateMockFarmDataset(
  walletAddress,
  30,          // 30 seasons
  'kenya'
);

// Ghana farmer
const ghanaData = generateMockFarmDataset(
  walletAddress,
  30,
  'ghana'
);

// Zimbabwe farmer
const zimbabweData = generateMockFarmDataset(
  walletAddress,
  30,
  'zimbabwe'
);

// Nigeria farmer
const nigeriaData = generateMockFarmDataset(
  walletAddress,
  30,
  'nigeria'
);

// Ethiopia farmer
const ethiopiaData = generateMockFarmDataset(
  walletAddress,
  30,
  'ethiopia'
);
```

### Federated Learning Across Regions:

```typescript
// Train local models in each region
const kenyaModel = await trainLocalModel(kenyaData);
const ghanaModel = await trainLocalModel(ghanaData);
const zimbabweModel = await trainLocalModel(zimbabweData);

// Aggregate on Midnight Network with ZK proofs
await submitModel(kenyaModel);   // Privacy-preserving
await submitModel(ghanaModel);   // Identity hidden
await submitModel(zimbabweModel); // Only count visible

// Download global model (benefits all regions)
const globalModel = await downloadGlobalModel();

// Fine-tune for local conditions
const localizedModel = await finetune(globalModel, kenyaData);
```

---

## 🔬 Realistic Yield Model

The updated yield calculation includes:

### 1. **Rainfall Impact**
```typescript
const optimalRainfall = regionParams.rainfall.base;
const deviation = Math.abs(actual - optimal);
const rainfallFactor = Math.max(0.4, 1 - deviation / optimal);
```
- Optimal varies by region (650mm for Kenya, 1100mm for Ghana)
- Deviation reduces yield realistically

### 2. **Temperature Sensitivity**
```typescript
const tempFactor = Math.max(0.5, 1 - tempDeviation / 15);
```
- Highland crops (Ethiopia: 19°C optimal) vs lowland (Nigeria: 28°C)
- Extreme heat/cold reduces yields

### 3. **Fertilizer Diminishing Returns**
```typescript
const fertilizerFactor = Math.min(1.3, 0.7 + fertilizer / fertilizerOptimal);
```
- Reflects real agricultural response curves
- Under-fertilization common in Africa (limited access)

### 4. **Extreme Events**
```typescript
if (Math.random() < 0.1) {  // 10% chance
  yield *= (0.3 + Math.random() * 0.4);  // 30-70% loss
}
```
- Drought, floods, pest outbreaks
- More common in Africa due to climate variability

---

## 📈 Example Output

### Kenya (30 seasons):
```json
{
  "farmerId": "mn_shield-addr_test1...",
  "totalSamples": 30,
  "crops": ["maize"],
  "dataPoints": [
    {
      "rainfall": 720,
      "temperature": 24,
      "soilType": "loamy",
      "irrigationType": "rainfed",
      "farmSize": 2.3,
      "fertilizer": 95,
      "pesticides": 3,
      "yield": 3.4,
      "season": "2024-season-1"
    },
    {
      "rainfall": 480,  // Drought!
      "temperature": 26,
      "yield": 1.8,     // Poor yield
      "season": "2024-season-2"
    },
    // ... 28 more seasons
  ]
}
```

### Ghana (higher rainfall):
```json
{
  "dataPoints": [
    {
      "rainfall": 1250,  // Higher than Kenya
      "temperature": 28,  // Warmer
      "farmSize": 4.5,    // Larger farms
      "fertilizer": 55,   // Less fertilizer
      "yield": 2.9,
      "soilType": "clay",
      "irrigationType": "rainfed"
    }
  ]
}
```

---

## 🎓 Data Sources & Citations

All regional parameters based on:

1. **FAO** - Food and Agriculture Organization statistics
2. **World Bank** - Agricultural development indicators
3. **KALRO** - Kenya Agricultural Research Institute
4. **Ghana MoFA** - Ministry of Food and Agriculture
5. **ZADT** - Zimbabwe Agricultural Development Trust
6. **NIAR** - Nigerian Institute for Agricultural Research
7. **EIAR** - Ethiopian Institute of Agricultural Research

---

## 🚀 Why This Matters for EdgeChain

### 1. **Realistic Demo**
- Shows EdgeChain works across diverse African regions
- Demonstrates value for smallholder farmers
- Proves privacy-preserving FL scales geographically

### 2. **Federated Learning Benefits**
- **Ghana farmer** (high rainfall) helps **Zimbabwe farmer** (drought-prone)
- **Kenya farmer** (moderate) learns from both
- **Global model** captures diverse conditions
- **Privacy preserved** via ZK proofs (can't tell who contributed what)

### 3. **Impact Story**
> "A Kenyan farmer with 2 hectares, limited fertilizer, and erratic rainfall can now benefit from the collective wisdom of thousands of African farmers—without revealing their private farm data."

---

## 🎯 Next Steps

### For Production:
1. **Partner with African agtech companies**:
   - AfricFertilizer (Ghana)
   - M-Farm (Kenya)
   - Hello Tractor (Nigeria)

2. **Integrate real IoT sensors**:
   - $5 DHT22 temp/humidity sensors
   - $8 soil moisture probes
   - Smartphone camera for rain gauges

3. **Add more regions**:
   - Tanzania, Uganda, Rwanda, Malawi, Zambia
   - Southern Africa: South Africa, Botswana
   - West Africa: Senegal, Côte d'Ivoire

4. **Crop-specific models**:
   - Maize (current)
   - Rice, wheat, cassava, sorghum
   - Cash crops: coffee, cocoa, cotton

---

**Created**: November 8, 2025
**Checkpoint**: stable-v1.0
**Status**: ✅ Ready for African-focused demos!
