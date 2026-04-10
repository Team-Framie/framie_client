import { type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { isLoggedIn } from "./lib/api";
import Index from "./pages/Index";
import Splash from "./pages/Splash";
import Login from "./pages/Login/Login";
import Join from "./pages/Join/Join";
import Custom1 from "./pages/custom/Custom1";
import Photo from "./pages/photo/Photo";
import Custom2 from "./pages/custom/Custom2";
import Photo1 from "./pages/custom/Photo1";
import TakePhoto from "./pages/photo/Takephoto";
import Mypage from "./pages/mypage/Mypage";
import CustomResult from "./pages/custom/Result";
import PhotoResult from "./pages/photo/Result";

function PrivateRoute({ children }: { children: ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />

      {/* 인증 필요 라우트 */}
      <Route path="/index" element={<PrivateRoute><Index /></PrivateRoute>} />
      <Route path="/custom1" element={<PrivateRoute><Custom1 /></PrivateRoute>} />
      <Route path="/custom2" element={<PrivateRoute><Custom2 /></PrivateRoute>} />
      <Route path="/photo1" element={<PrivateRoute><Photo /></PrivateRoute>} />
      <Route path="/customphoto1" element={<PrivateRoute><Photo1 /></PrivateRoute>} />
      <Route path="/takephoto" element={<PrivateRoute><TakePhoto /></PrivateRoute>} />
      <Route path="/mypage" element={<PrivateRoute><Mypage /></PrivateRoute>} />
      <Route path="/custom/result" element={<PrivateRoute><CustomResult /></PrivateRoute>} />
      <Route path="/photo/result" element={<PrivateRoute><PhotoResult /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
