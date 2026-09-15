import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="max-w-lg py-10">
      <h1 className="text-2xl font-bold">Nicht gefunden</h1>
      <div className="mt-5 flex gap-2">
        <Link to="/" className="btn btn-primary">
          Home
        </Link>
        <Link to="/apps" className="btn">
          Apps
        </Link>
      </div>
    </div>
  );
}
