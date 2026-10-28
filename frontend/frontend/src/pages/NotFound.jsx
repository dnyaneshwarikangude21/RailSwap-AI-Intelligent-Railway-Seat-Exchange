import { ArrowLeft, TrainFront } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export default function NotFound() {
  const { user } = useAuth();
  const destination = user ? "/dashboard" : "/login";
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <span className="brand-mark large">
          <TrainFront size={30} />
        </span>
        <span className="eyebrow">404 · Wrong platform</span>
        <h1>This route does not exist.</h1>
        <p>
          The page may have moved, or the journey workspace link is no longer
          available.
        </p>
        <Link to={destination} className="btn btn-primary">
          <ArrowLeft size={17} />
          {user ? "Back to dashboard" : "Back to sign in"}
        </Link>
      </div>
    </div>
  );
}
