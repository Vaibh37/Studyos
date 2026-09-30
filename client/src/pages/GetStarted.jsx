import { Navigate } from "react-router";

import "../App.css";

import Welcome from "./Welcome";
import { useAuth } from "../context/AuthContext";

function GetStarted() {
  const { loading, mode } = useAuth();

  if (loading) {
    return <div className="auth-v1-loading">StudyOS</div>;
  }

  if (mode !== "none") {
    return <Navigate to="/app" replace />;
  }

  return <Welcome />;
}

export default GetStarted;

