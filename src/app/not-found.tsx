import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page empty">
      <h1>This page is out of the spotlight.</h1>
      <p>Head back to your workspace to find what you need.</p>
      <Link className="button button-primary" href="/dashboard">
        Back to overview
      </Link>
    </div>
  );
}
