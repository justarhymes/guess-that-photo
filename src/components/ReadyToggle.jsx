export default function ReadyToggle({
  isReady,
  onToggle,
  disabled,
  readyLabel = "Ready?",
  cancelLabel = "Cancel ready",
}) {
  if (isReady) {
    return (
      <button
        type='button'
        className='font-dynapuff text-sm py-1 px-2 rounded-xl bg-rose-500 hover:bg-rose-400 transition'
        onClick={() => onToggle(false)}
        disabled={disabled}>
        {cancelLabel}
      </button>
    );
  }

  return (
    <button
      type='button'
      className='font-dynapuff text-sm py-1 px-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition'
      onClick={() => onToggle(true)}
      disabled={disabled}>
      {readyLabel}
    </button>
  );
}
