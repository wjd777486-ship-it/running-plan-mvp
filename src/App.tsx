import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./views/MainPage";
import OnboardingPage from "./views/OnboardingPage";
import PlanPage from "./views/PlanPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/plan" element={<PlanPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
