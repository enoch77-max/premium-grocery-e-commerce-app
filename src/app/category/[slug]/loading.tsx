export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-[1340px] 2xl:max-w-[1600px] px-4 pt-4 sm:px-6 sm:pt-5">
      <div className="shimmer h-3 w-32 rounded" />
      <div className="shimmer mt-3 h-[190px] w-full rounded-[26px]" />
      <div className="mt-4 grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="hidden space-y-3 lg:block">
          <div className="shimmer h-72 w-full rounded-2xl" />
          <div className="shimmer h-28 w-full rounded-2xl" />
        </div>
        <div>
          <div className="shimmer h-10 w-full rounded-2xl" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
              <div key={item} className="shimmer aspect-[3/4] w-full rounded-[20px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
