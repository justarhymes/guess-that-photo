import { useMemo, useState } from "react";

const croodlesUrl = (seed) =>
  `https://api.dicebear.com/7.x/croodles/svg?seed=${seed}&size=96&backgroundType=gradientLinear,solid`;

function randomSeeds(count) {
  return Array.from({ length: count }, () =>
    Math.random().toString(36).slice(2, 10)
  );
}

export default function AvatarPicker({
  value,
  onChange,
  count = 10,
  label = "Pick an avatar",
}) {
  const [seeds, setSeeds] = useState(() => randomSeeds(count));
  const avatars = useMemo(
    () => seeds.map((seed) => ({ seed, url: croodlesUrl(seed) })),
    [seeds]
  );

  const regenerate = () => setSeeds(randomSeeds(count));

  return (
    <div className='mb-6'>
      <div className='flex justify-between mb-2'>
        <div className='text-lg font-semibold text-white'>{label}</div>
        <button
          type='button'
          className='border-violet-900 border-2 p-2 rounded-xl text-violet-900 font-dynapuff text-xs hover:bg-violet-600 hover:text-white'
          onClick={regenerate}>
          Shuffle
        </button>
      </div>
      <div className='grid grid-cols-5 gap-4'>
        {avatars.map(({ seed, url }, index) => {
          const selected = value?.seed === seed;
          return (
            <button
              type='button'
              key={seed}
              onClick={() => onChange({ seed, url })}
              className={`transition-all border-2 rounded-full focus:outline-none ${
                selected
                  ? "border-rose-500 bg-violet-200 shadow-lg focus:border-rose-600"
                  : "border-zinc-100 bg-zinc-100 focus:border-violet-900"
              }`}>
              <img
                src={url}
                alt={seed}
                className='block w-full h-auto avatar-float'
                style={{ animationDelay: `${index * 0.8}s` }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
