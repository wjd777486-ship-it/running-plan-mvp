import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import OnboardingPage from "./pages/OnboardingPage";
import PlanPage from "./pages/PlanPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/plan" element={<PlanPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
