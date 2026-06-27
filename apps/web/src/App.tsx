import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { LoginRoute } from "./routes/LoginRoute";
import { RegisterRoute } from "./routes/RegisterRoute";
import { SelectionRoute } from "./routes/SelectionRoute";
import { IoTRoute } from "./routes/IoTRoute";
import { TrainRoute } from "./routes/TrainRoute";
import { PrivacyTrainRoute } from "./routes/PrivacyTrainRoute";
import { AggregationRoute } from "./routes/AggregationRoute";
import { PredictionsRoute } from "./routes/PredictionsRoute";
import { PilotLoginRoute } from "./routes/PilotLoginRoute";
import { FarmAssistantRoute } from "./routes/FarmAssistantRoute";
import { FarmCheckInRoute } from "./routes/FarmCheckInRoute";
import { FarmTimelineRoute } from "./routes/FarmTimelineRoute";
import { VirtualNdaniRoute } from "./routes/VirtualNdaniRoute";
import { VirtualNdaniReadingRoute } from "./routes/VirtualNdaniReadingRoute";
import { CoordinatorRoute } from "./routes/CoordinatorRoute";
import { PhysicalNdaniDemoRoute } from "./routes/PhysicalNdaniDemoRoute";
import { AgentSessionProvider } from "./agent/AgentSessionProvider";
import { isFarmerSite } from "./agent/siteMode";
import Navbar from "./components/Navbar";
import "./app.css";
import { Toaster } from "sonner";

// Main App Component with Router
export default function EdgeChainApp() {
  return (
    <AppProvider>
      <AgentSessionProvider>
        <BrowserRouter>
          <Navbar />
          <Toaster position="top-right" />
          <Routes>
            {/* Existing wallet-first application routes */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/register" element={<RegisterRoute />} />
            <Route path="/selection" element={<SelectionRoute />} />
            <Route path="/sensor-node" element={<IoTRoute />} />
            <Route path="/train" element={<TrainRoute />} />
            <Route path="/train-privacy" element={<PrivacyTrainRoute />} />
            <Route path="/aggregation" element={<AggregationRoute />} />
            <Route path="/predictions" element={<PredictionsRoute />} />

            {/* Additive AI Farm Agent pilot routes */}
            <Route path="/pilot-login" element={<PilotLoginRoute />} />
            <Route path="/virtual-ndani" element={<VirtualNdaniRoute />} />
            <Route path="/virtual-ndani/reading" element={<VirtualNdaniReadingRoute />} />
            <Route path="/virtual-ndani/demo" element={<PhysicalNdaniDemoRoute />} />
            <Route path="/farm-check-in" element={<FarmCheckInRoute />} />
            <Route path="/farm-timeline" element={<FarmTimelineRoute />} />
            <Route path="/farm-assistant" element={<FarmAssistantRoute />} />
            <Route path="/coordinator" element={<CoordinatorRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AgentSessionProvider>
    </AppProvider>
  );
}

function HomeRoute() {
  return isFarmerSite() ? <Navigate to="/pilot-login" replace /> : <LoginRoute />;
}
