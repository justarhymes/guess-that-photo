export default function PlayerList({ users, noTitle = false, currentUserId, showReadyState = true }) {
  return (
    <div className='flex-shrink'>
      {noTitle === false && (
        <div className='text-lg font-dynapuff text-white'>Players</div>
      )}
      <div className='scroll-shadow grid h-auto max-h-[60vh] gap-3 pr-2'>
        {users.map((user) => {
          const isCurrent = user.id === currentUserId;
          const showReady = showReadyState && typeof user.ready === 'boolean';
          return (
            <div
              key={user.id}
              className='flex items-center gap-3 rounded-2xl bg-white/5 text-white backdrop-blur'>
              <img
                src={
                  user.photoURL ||
                  `https://api.dicebear.com/7.x/croodles/svg?seed=${
                    user.avatarSeed || user.id
                  }&size=80`
                }
                alt={user.name}
                className='h-12 w-12'
              />
              <div className='flex-1 py-1'>
                <div>
                  <strong className='font-semibold mr-1'>{user.name}</strong>
                  {user.role === "host" && (
                    <span className='rounded-lg bg-violet-500 px-2 py-0.5 text-xs lowercase'>
                      Host
                    </span>
                  )}
                  {isCurrent && user.role !== "host" && (
                    <span className='text-xs lowercase'>(It's me!)</span>
                  )}
                </div>
              </div>
              {showReady && (
                user.ready ? (
                  <span className='rounded-full bg-green-400/50 px-3 py-1 mr-1 text-xs font-semibold text-green-900 shadow-sm'>
                    Ready
                  </span>
                ) : (
                  <span className='rounded-full bg-rose-500/20 px-3 py-1 mr-1 text-xs font-semibold text-rose-200 shadow-sm'>
                    Not ready
                  </span>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
