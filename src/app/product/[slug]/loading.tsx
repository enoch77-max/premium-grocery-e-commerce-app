export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-[1340px] px-4 pb-16 pt-4 sm:px-6 sm:pt-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div>
          <div className="shimmer aspect-square w-full rounded-[26px]" />
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="shimmer h-12 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="shimmer h-3 w-28 rounded" />
          <div className="shimmer h-9 w-3/4 rounded-lg" />
          <div className="shimmer h-3 w-44 rounded" />
          <div className="shimmer h-24 w-full rounded-2xl" />
          <div className="shimmer h-16 w-full rounded-2xl" />
          <div className="shimmer h-12 w-full rounded-full" />
          <div className="shimmer h-12 w-full rounded-full" />
          <div className="shimmer h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
