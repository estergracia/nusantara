// src/components/TelemetryRouteTracker.jsx
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Telemetry from "../utils/telemetry.js";

export default function TelemetryRouteTracker() {
  const loc = useLocation();
  const prev = useRef(null);

  useEffect(() => {
    const to = loc.pathname + loc.search;
    const from = prev.current;
    prev.current = to;

    Telemetry.trackNavigation(to, from);
    Telemetry.logEvent("route_view", { path: loc.pathname, search: loc.search });
  }, [loc.pathname, loc.search]);

  return null;
}
