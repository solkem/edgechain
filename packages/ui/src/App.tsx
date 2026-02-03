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
import Navbar from "./components/Navbar";
import "./app.css";
import { Toaster } from "sonner";

// Main App Component with Router
export default function EdgeChainApp() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Navbar />
        <Toaster position="top-right" />
        <Routes>
          {/* Main app routes */}
          <Route path="/" element={<LoginRoute />} />
          <Route path="/register" element={<RegisterRoute />} />
          <Route path="/selection" element={<SelectionRoute />} />
          <Route path="/arduino" element={<IoTRoute />} /> {/* Keep /arduino path for backward compatibility */}
          <Route path="/train" element={<TrainRoute />} />
          <Route path="/train-privacy" element={<PrivacyTrainRoute />} />
          <Route path="/aggregation" element={<AggregationRoute />} />
          <Route path="/predictions" element={<PredictionsRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
