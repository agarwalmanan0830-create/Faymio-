"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page empty">
      <h1>Something interrupted this view.</h1>
      <p>
        Your saved records are still in the database. Try loading the page
        again.
      </p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
